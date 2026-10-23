"""Restricciones del esquema 0001, comprobadas contra PostgreSQL (ADR 0013)."""

import uuid

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from app.modules.catalog.models import Categoria, ImagenProducto, Producto, Tienda
from app.modules.identity.models import Usuario, UsuarioRol
from app.modules.inventory.models import Existencia, MovimientoExistencias
from app.modules.orders.models import ESTADOS_PEDIDO, Pedido, PedidoHistorial, PedidoLinea
from app.shared.database import SessionLocal


def _tienda(sesion: Session, identificador: str = "antojos") -> Tienda:
    tienda = Tienda(identificador=identificador, nombre=identificador.title())
    sesion.add(tienda)
    sesion.flush()
    return tienda


def _producto(sesion: Session, tienda: Tienda, **campos) -> Producto:
    producto = Producto(
        tienda_id=tienda.id,
        nombre=campos.pop("nombre", "Arepa"),
        precio_centavos=campos.pop("precio_centavos", 1000),
        **campos,
    )
    sesion.add(producto)
    sesion.flush()
    return producto


def _pedido(sesion: Session) -> Pedido:
    pedido = Pedido(usuario_id=1, tienda_id=1, total_centavos=0, clave_idempotencia=uuid.uuid4())
    sesion.add(pedido)
    sesion.flush()
    return pedido


def test_precio_no_puede_ser_negativo(sesion) -> None:
    with pytest.raises(IntegrityError, match="ck_productos_precio_no_negativo"):
        _producto(sesion, _tienda(sesion), precio_centavos=-1)


def test_nombre_de_producto_unico_por_tienda_sin_mayusculas(sesion) -> None:
    tienda = _tienda(sesion)
    _producto(sesion, tienda, nombre="Arepa")
    _producto(sesion, _tienda(sesion, "alegria"), nombre="Arepa")  # otra tienda: válido
    with pytest.raises(IntegrityError, match="ix_productos_tienda_id_nombre_lower"):
        _producto(sesion, tienda, nombre="AREPA")


def test_cantidad_no_puede_ser_negativa(sesion) -> None:
    sesion.add(Existencia(producto_id=1, cantidad=-1))
    with pytest.raises(IntegrityError, match="ck_existencias_cantidad_no_negativa"):
        sesion.flush()


def test_categoria_debe_ser_de_la_misma_tienda(sesion) -> None:
    antojos, alegria = _tienda(sesion), _tienda(sesion, "alegria")
    categoria = Categoria(tienda_id=alegria.id, nombre="Helados")
    sesion.add(categoria)
    sesion.flush()

    _producto(sesion, antojos, nombre="Sin categoría")  # NULL: MATCH SIMPLE lo admite
    with pytest.raises(IntegrityError, match="fk_productos_categoria_id_tienda_id_categorias"):
        _producto(sesion, antojos, nombre="Cruzado", categoria_id=categoria.id)


def test_una_sola_imagen_principal_por_producto(sesion) -> None:
    producto = _producto(sesion, _tienda(sesion))
    sesion.add(ImagenProducto(producto_id=producto.id, url="/media/a.webp", es_principal=True))
    sesion.add(ImagenProducto(producto_id=producto.id, url="/media/b.webp"))
    sesion.flush()
    sesion.add(ImagenProducto(producto_id=producto.id, url="/media/c.webp", es_principal=True))
    with pytest.raises(IntegrityError, match="ix_imagenes_producto_principal"):
        sesion.flush()


def test_cancelar_exige_comentario(sesion) -> None:
    pedido = _pedido(sesion)
    sesion.add(PedidoHistorial(pedido_id=pedido.id, estado_anterior="pendiente_pago", estado_nuevo="cancelado"))
    with pytest.raises(IntegrityError, match="ck_pedido_historial_cancelacion_con_comentario"):
        sesion.flush()


def test_estados_validos_comparten_fuente_con_el_check(sesion) -> None:
    pedido = _pedido(sesion)
    for estado in ESTADOS_PEDIDO:
        sesion.add(PedidoHistorial(pedido_id=pedido.id, estado_nuevo=estado, comentario="ok"))
    sesion.flush()
    sesion.add(PedidoHistorial(pedido_id=pedido.id, estado_nuevo="perdido"))
    with pytest.raises(IntegrityError, match="ck_pedido_historial_estado_nuevo_valido"):
        sesion.flush()


def test_subtotal_es_columna_generada(sesion) -> None:
    pedido = _pedido(sesion)
    linea = PedidoLinea(
        pedido_id=pedido.id,
        linea=1,
        producto_id=7,
        producto_nombre="Arepa",
        precio_unitario_centavos=1_500_000,
        cantidad=3,
    )
    sesion.add(linea)
    sesion.flush()
    sesion.refresh(linea)
    assert linea.subtotal_centavos == 4_500_000


def test_correo_unico_sin_distinguir_mayusculas(sesion) -> None:
    sesion.add(Usuario(nombre="Ana", correo="Ana@utb.edu.co", hash_contrasena="x"))
    sesion.flush()
    sesion.add(Usuario(nombre="Ana Dos", correo="ana@UTB.edu.co", hash_contrasena="x"))
    with pytest.raises(IntegrityError, match="ix_usuarios_correo_lower"):
        sesion.flush()


def test_rol_global_no_se_duplica_con_tienda_nula(sesion) -> None:
    usuario = Usuario(nombre="Ana", correo="ana@utb.edu.co", hash_contrasena="x")
    sesion.add(usuario)
    sesion.flush()
    sesion.add(UsuarioRol(usuario_id=usuario.id, rol_codigo="admin_general"))
    sesion.flush()
    sesion.add(UsuarioRol(usuario_id=usuario.id, rol_codigo="admin_general"))
    with pytest.raises(IntegrityError, match="uq_usuario_roles_usuario_id_rol_codigo_tienda_id"):
        sesion.flush()


def test_ajuste_exige_motivo(sesion) -> None:
    sesion.add(Existencia(producto_id=1, cantidad=5))
    sesion.flush()
    sesion.add(MovimientoExistencias(producto_id=1, tipo="ajuste", cambio=-1, cantidad_resultante=4))
    with pytest.raises(IntegrityError, match="ck_movimientos_existencias_ajuste_con_motivo"):
        sesion.flush()


def test_bloqueo_optimista_en_existencias() -> None:
    """F-03: la segunda escritura concurrente falla en lugar de pisar la primera."""
    with SessionLocal() as preparacion, preparacion.begin():
        preparacion.add(Existencia(producto_id=1, cantidad=10))

    with SessionLocal() as primera, SessionLocal() as segunda:
        en_primera = primera.get(Existencia, 1)
        en_segunda = segunda.get(Existencia, 1)
        assert en_primera.version == en_segunda.version == 1

        en_primera.cantidad = 9
        primera.commit()
        assert en_primera.version == 2

        en_segunda.cantidad = 8
        with pytest.raises(StaleDataError):
            segunda.commit()
