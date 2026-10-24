"""API HTTP del módulo de identidad."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.modules.identity import contrasenas, repository, tokens
from app.modules.identity.schemas import (
    LoginRequest,
    RegisterRequest,
    RolAsignado,
    TokenResponse,
    UserOut,
)
from app.shared.database import cambiar_contexto, get_session
from app.shared.errores import respuestas
from app.shared.seguridad import ContextoSeguridad, requiere_usuario

router = APIRouter(prefix="/identity", tags=["identity"])

def _usuario_out(session: Session, usuario_id: int) -> UserOut:
    perfil = repository.perfil(session, usuario_id)
    if perfil is None:  # Solo si la cuenta se borró entre la validación y la lectura.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o vencida")
    return UserOut(
        id=perfil.id,
        nombre=perfil.nombre,
        email=perfil.correo,
        roles=[
            RolAsignado(codigo=r.rol_codigo, tienda_id=r.tienda_id)
            for r in repository.roles(session, usuario_id)
        ],
        creado_en=perfil.creado_en,
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    responses=respuestas(e409="El correo ya está registrado"),
)
def register(
    datos: RegisterRequest, session: Annotated[Session, Depends(get_session)]
) -> UserOut:
    """Crea una cuenta de comprador. El correo no distingue mayúsculas."""
    try:
        usuario_id = repository.registrar_comprador(
            session,
            nombre=datos.nombre.strip(),
            correo=str(datos.email),
            hash_contrasena=contrasenas.generar(datos.password),
        )
    except repository.CorreoDuplicado:
        raise HTTPException(status.HTTP_409_CONFLICT, "El correo ya está registrado") from None
    # Desde aquí actúa la cuenta recién creada: RLS le deja leer su perfil.
    cambiar_contexto(session, ContextoSeguridad(usuario_id=usuario_id))
    usuario = _usuario_out(session, usuario_id)
    session.commit()
    return usuario


@router.post("/login", responses=respuestas(e401="Credenciales inválidas"))
def login(datos: LoginRequest, session: Annotated[Session, Depends(get_session)]) -> TokenResponse:
    """Autentica con correo y contraseña y entrega un token de acceso."""
    credenciales = repository.buscar_credenciales(session, str(datos.email))
    valida = contrasenas.verificar(
        credenciales.hash_contrasena if credenciales else None, datos.password
    )
    if not (valida and credenciales and credenciales.activo):
        # Mismo mensaje para correo inexistente, contraseña errónea o cuenta
        # inactiva: no se revela cuál falló.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(
        access_token=tokens.emitir(credenciales.id), expires_in=tokens.vigencia_segundos()
    )


@router.get("/me", responses=respuestas(e401="Token ausente, inválido o vencido"))
def me(
    contexto: Annotated[ContextoSeguridad, Depends(requiere_usuario)],
    session: Annotated[Session, Depends(get_session)],
) -> UserOut:
    """Perfil y roles del usuario autenticado."""
    return _usuario_out(session, contexto.usuario_id)
