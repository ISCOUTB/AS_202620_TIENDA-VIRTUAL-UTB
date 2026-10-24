"""API HTTP del módulo de catálogo."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.catalog import repository
from app.modules.catalog.models import Producto
from app.modules.catalog.public import asegurar_categoria
from app.modules.catalog.schemas import (
    ProductCreateRequest,
    ProductOut,
    ProductUpdateRequest,
    TiendaOut,
)
from app.shared.database import RutaConSesion, get_session
from app.shared.errores import respuestas
from app.shared.seguridad import (
    ContextoSeguridad,
    contexto_actual,
    prohibido_en_tienda,
    requiere_usuario,
)

router = APIRouter(prefix="/catalog", tags=["catalogo"], route_class=RutaConSesion)

Sesion = Annotated[Session, Depends(get_session)]
Usuario = Annotated[ContextoSeguridad, Depends(requiere_usuario)]
ProductId = Annotated[int, Path(alias="productId", description="ID del producto")]


@router.get("/products", responses=respuestas(e401="Token inválido"))
def get_products(
    session: Sesion,
    contexto: Annotated[ContextoSeguridad, Depends(contexto_actual)],
    incluir_inactivos: Annotated[
        bool,
        Query(description="Incluye los inactivos de las tiendas que el usuario gestiona."),
    ] = False,
) -> list[ProductOut]:
    """Lista los productos disponibles en el catálogo."""
    filas = repository.list_products(
        session,
        tiendas_gestionadas=(contexto.tiendas_admin | contexto.tiendas_inventario)
        if incluir_inactivos
        else None,
        todas=incluir_inactivos and contexto.es_admin_general,
    )
    return [ProductOut.model_validate(p) for p in filas]


def _producto_out(
    session: Session, producto_id: int, contexto: ContextoSeguridad | None = None
) -> ProductOut:
    """Producto por id. Con `contexto`, uno inactivo solo lo ve quien gestiona su tienda
    o el admin general (la misma regla que RLS aplica en la base)."""
    fila = repository.product(session, producto_id)
    oculto = (
        fila is not None
        and contexto is not None
        and not (fila.activo and fila.tienda_activa)
        and not contexto.supervisa_tienda(fila.tienda_id)
    )
    if fila is None or oculto:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return ProductOut.model_validate(fila)


@router.get(
    "/products/{productId}",
    responses=respuestas(e401="Token inválido", e404="Producto no encontrado"),
)
def get_product(
    product_id: ProductId,
    session: Sesion,
    contexto: Annotated[ContextoSeguridad, Depends(contexto_actual)],
) -> ProductOut:
    """Detalle de un producto activo (o inactivo, para quien gestiona su tienda)."""
    return _producto_out(session, product_id, contexto)


@router.get("/tiendas")
def get_stores(session: Sesion) -> list[TiendaOut]:
    """Tiendas activas de la cafetería."""
    return [TiendaOut.model_validate(t) for t in repository.list_stores(session)]


def _guardar(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Ya existe un producto con ese nombre en la tienda"
        ) from None


@router.post(
    "/products",
    status_code=status.HTTP_201_CREATED,
    responses=respuestas(
        e401="Token ausente o inválido",
        e403="No administra la tienda",
        e404="Tienda no encontrada",
        e409="Nombre repetido en la tienda",
    ),
)
def create_product(datos: ProductCreateRequest, contexto: Usuario, session: Sesion) -> ProductOut:
    """Registra un producto. Sus existencias se cargan aparte, en Inventario."""
    tienda = repository.tienda_por_identificador(session, datos.tienda)
    if tienda is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tienda no encontrada")
    if not contexto.administra_tienda(tienda.id):
        raise prohibido_en_tienda(contexto, "No administras esta tienda")
    producto = Producto(
        tienda_id=tienda.id,
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        precio_centavos=datos.precio_centavos,
        categoria_id=asegurar_categoria(session, tienda_id=tienda.id, nombre=datos.categoria)
        if datos.categoria
        else None,
        presentacion=datos.presentacion,
        precio_confirmado=datos.precio_confirmado,
        activo=datos.activo,
    )
    session.add(producto)
    _guardar(session)
    return _producto_out(session, producto.id)


@router.patch(
    "/products/{productId}",
    responses=respuestas(
        e401="Token ausente o inválido",
        e403="No administra la tienda",
        e404="Producto no encontrado",
        e409="Nombre repetido en la tienda",
    ),
)
def update_product(
    product_id: ProductId, datos: ProductUpdateRequest, contexto: Usuario, session: Sesion
) -> ProductOut:
    """Edita un producto o lo habilita/deshabilita para la venta."""
    producto = repository.obtener(session, product_id)
    if producto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    if not contexto.administra_tienda(producto.tienda_id):
        raise prohibido_en_tienda(contexto, "No administras esta tienda")
    cambios = datos.model_dump(exclude_unset=True)
    if "categoria" in cambios:
        nombre = cambios.pop("categoria")
        producto.categoria_id = (
            asegurar_categoria(session, tienda_id=producto.tienda_id, nombre=nombre)
            if nombre
            else None
        )
    for campo, valor in cambios.items():
        if valor is None and campo not in {"presentacion"}:
            continue  # null solo borra la presentación; el resto es obligatorio
        setattr(producto, campo, valor)
    _guardar(session)
    return _producto_out(session, producto.id)
