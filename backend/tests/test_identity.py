"""Registro, login y sesión actual (módulo identity, ADR 0016)."""

import os
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.modules.identity import contrasenas, repository, tokens
from app.modules.identity.models import Usuario
from app.modules.identity.public import asegurar_admin_general, principal_desde_token
from app.shared.database import SessionLocal, engine
from app.shared.seguridad import ANONIMO, ContextoSeguridad, aplicar_contexto
from tests.conftest import asignar_rol, registrar_y_entrar

ROL_APP = os.getenv("APP_DB_USER", "tienda_app")

DATOS = {"nombre": "Ana Pérez", "email": "Ana@UTB.edu.co", "password": "clave-segura-1"}


def test_registro_crea_comprador_con_hash_argon2(cliente) -> None:
    respuesta = cliente.post("/identity/register", json=DATOS)

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["nombre"] == "Ana Pérez"
    assert cuerpo["roles"] == [{"codigo": "comprador", "tienda_id": None}]
    assert "password" not in cuerpo and "hash_contrasena" not in cuerpo
    with SessionLocal() as session:
        guardado = session.scalar(select(Usuario.hash_contrasena))
    assert guardado.startswith("$argon2id$")


def test_registro_rechaza_correo_repetido_sin_distinguir_mayusculas(cliente) -> None:
    cliente.post("/identity/register", json=DATOS)
    respuesta = cliente.post("/identity/register", json={**DATOS, "email": "ana@utb.edu.co"})

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detail": "El correo ya está registrado"}


def test_registro_valida_campos(cliente) -> None:
    corta = cliente.post("/identity/register", json={**DATOS, "password": "1234567"})
    correo = cliente.post("/identity/register", json={**DATOS, "email": "no-es-correo"})

    assert corta.status_code == 422
    assert correo.status_code == 422


def test_login_entrega_token_y_me_devuelve_el_perfil(cliente) -> None:
    cliente.post("/identity/register", json=DATOS)
    login = cliente.post(
        "/identity/login", json={"email": "ana@utb.edu.co", "password": DATOS["password"]}
    )

    assert login.status_code == 200
    token = login.json()
    assert token["token_type"] == "bearer"
    assert token["expires_in"] == tokens.vigencia_segundos()

    me = cliente.get(
        "/identity/me", headers={"Authorization": f"Bearer {token['access_token']}"}
    )
    assert me.status_code == 200
    # EmailStr normaliza el dominio; la parte local se conserva tal cual.
    assert me.json()["email"] == "Ana@utb.edu.co"


def test_login_no_revela_si_falla_el_correo_o_la_contrasena(cliente) -> None:
    cliente.post("/identity/register", json=DATOS)
    mala = cliente.post("/identity/login", json={"email": DATOS["email"], "password": "otra-clave"})
    inexistente = cliente.post(
        "/identity/login", json={"email": "nadie@utb.edu.co", "password": "otra-clave"}
    )

    assert mala.status_code == inexistente.status_code == 401
    assert mala.json() == inexistente.json()


def test_cuenta_inactiva_no_entra_y_su_token_deja_de_valer(cliente) -> None:
    cabecera = registrar_y_entrar(cliente)
    with SessionLocal() as session, session.begin():
        session.execute(text("UPDATE usuarios SET activo = false"))

    assert cliente.get("/identity/me", headers=cabecera).status_code == 401
    login = cliente.post(
        "/identity/login", json={"email": "ana@utb.edu.co", "password": "clave-segura-1"}
    )
    assert login.status_code == 401


def test_me_exige_token_valido(cliente) -> None:
    vencido = jwt.encode(
        {
            "sub": "1",
            "iat": datetime.now(UTC) - timedelta(hours=2),
            "exp": datetime.now(UTC) - timedelta(hours=1),
        },
        "clave-de-pruebas-que-no-se-usa-en-produccion",
        algorithm="HS256",
    )
    otra_clave = jwt.encode(
        {"sub": "1", "iat": datetime.now(UTC), "exp": datetime.now(UTC) + timedelta(hours=1)},
        "otra-clave-distinta-de-la-del-servidor-32b",
        algorithm="HS256",
    )

    assert cliente.get("/identity/me").status_code == 401
    for token in (vencido, otra_clave, "basura"):
        respuesta = cliente.get("/identity/me", headers={"Authorization": f"Bearer {token}"})
        assert respuesta.status_code == 401
        assert respuesta.headers["www-authenticate"] == "Bearer"


def test_token_invalido_en_ruta_publica_responde_401(cliente) -> None:
    """Un token roto no degrada a anónimo: el cliente debe cerrar la sesión."""
    respuesta = cliente.get("/catalog/products", headers={"Authorization": "Bearer basura"})

    assert respuesta.status_code == 401


def test_principal_lleva_roles_y_tiendas(cliente, datos_demo) -> None:
    registrar_y_entrar(cliente)
    asignar_rol("ana@utb.edu.co", "admin_tienda", tienda_id=1)
    asignar_rol("ana@utb.edu.co", "responsable_inventario", tienda_id=2)
    with SessionLocal() as session:
        usuario_id = session.scalar(select(Usuario.id))

    principal = principal_desde_token(tokens.emitir(usuario_id))

    assert principal.roles == {"comprador", "admin_tienda", "responsable_inventario"}
    assert principal.tiendas_admin == {1}
    assert principal.tiendas_inventario == {2}
    assert principal.gestiona_inventario(1) and principal.gestiona_inventario(2)
    assert not principal.administra_tienda(2)


def test_rol_sin_tienda_vale_en_todas(cliente, datos_demo) -> None:
    registrar_y_entrar(cliente)
    asignar_rol("ana@utb.edu.co", "admin_tienda")
    with SessionLocal() as session:
        usuario_id = session.scalar(select(Usuario.id))

    principal = principal_desde_token(tokens.emitir(usuario_id))

    assert principal.tiendas_admin == set(range(1, datos_demo["tiendas"] + 1))


def test_admin_general_sembrado_es_idempotente_y_no_pisa_la_contrasena(cliente) -> None:
    with SessionLocal() as session, session.begin():
        primero = asegurar_admin_general(
            session, nombre="Admin", correo="admin@utb.edu.co", contrasena="clave-admin-1"
        )
    with SessionLocal() as session, session.begin():
        segundo = asegurar_admin_general(
            session, nombre="Admin", correo="ADMIN@utb.edu.co", contrasena="otra-clave-2"
        )

    assert primero == segundo
    login = cliente.post(
        "/identity/login", json={"email": "admin@utb.edu.co", "password": "clave-admin-1"}
    )
    me = cliente.get(
        "/identity/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"}
    )
    assert me.json()["roles"] == [{"codigo": "admin_general", "tienda_id": None}]


def test_consultas_de_identidad_funcionan_con_el_rol_de_aplicacion() -> None:
    """La API real corre como `tienda_app`, sujeta a RLS y sin leer el hash."""
    with engine.connect() as conexion:
        transaccion = conexion.begin()
        try:
            conexion.execute(text(f'SET LOCAL ROLE "{ROL_APP}"'))
            aplicar_contexto(conexion, ANONIMO)
            session = Session(bind=conexion)
            usuario_id = repository.registrar_comprador(
                session,
                nombre="Ana",
                correo="ana@utb.edu.co",
                hash_contrasena=contrasenas.generar("clave-segura-1"),
            )
            # Anónimo: no ve perfiles; las credenciales salen por la función.
            assert repository.perfil(session, usuario_id) is None
            credenciales = repository.buscar_credenciales(session, "ANA@utb.edu.co")
            assert contrasenas.verificar(credenciales.hash_contrasena, "clave-segura-1")

            aplicar_contexto(conexion, ContextoSeguridad(usuario_id=usuario_id))
            assert repository.perfil(session, usuario_id).correo == "ana@utb.edu.co"
            assert [r.rol_codigo for r in repository.roles(session, usuario_id)] == ["comprador"]
        finally:
            transaccion.rollback()
