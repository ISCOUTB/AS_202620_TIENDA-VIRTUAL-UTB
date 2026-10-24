# ADR 0016: Autenticación con JWT firmado (HS256) y contraseñas con Argon2id

- **Estado:** Propuesta — pendiente de revisión y ratificación del equipo
- **Fecha:** 2026-10-24
- **Relacionada:** [ADR 0001](0001-monolito-modular.md) (pide un ADR al definir
  el mecanismo de autenticación), [ADR 0011](0011-sesion-localstorage.md)
  (sesión del frontend), [ADR 0012](0012-proxy-interno-api.md) (proxy interno),
  [ADR 0014](0014-seguridad-rls.md) (RLS y funciones de identidad) y el
  escenario 1 de [`escenarios-calidad.md`](../escenarios-calidad.md).

## Contexto

El contrato de diseño (`docs/openapi/tienda-virtual.yaml`) ya declaraba
`POST /identity/register`, `POST /identity/login`, `GET /identity/me` y el
esquema `bearerAuth` (JWT). El frontend envía `Authorization: Bearer` a través
del proxy interno (ADR 0012) y guarda el token en `localStorage` (ADR 0011).
La base ya tiene `usuarios`, `roles` y `usuario_roles` con roles por tienda, y
las funciones `identidad_buscar_credenciales` e `identidad_registrar_comprador`
(ADR 0014). Faltaba decidir cómo se emite y valida la credencial, y cómo llega
el principal a las políticas RLS (`contexto_actual`, marcado `TODO(identity)`).

Restricciones:

- La API corre como un solo proceso (ADR 0010), sin caché compartida ni Redis.
- La API no es pública: solo el frontend la alcanza (ADR 0012).
- La API usa un rol sin acceso a `hash_contrasena` (ADR 0014).
- Retirar un rol o desactivar una cuenta debe surtir efecto sin esperar a que
  venza la sesión (escenario 1: autorización por rol que no se pueda eludir).

## Alternativas consideradas

1. **Sesiones opacas en una tabla.** Revocación inmediata, pero exige una tabla
   y un esquema nuevos, y una consulta extra por petición que JWT también
   necesita para leer los roles. No aporta más que la alternativa 3 en este
   alcance.
2. **JWT con los roles dentro del token.** Sin consulta a la base por
   petición, pero un rol retirado seguiría valiendo hasta que el token venza.
   Rechazada por el escenario 1.
3. **JWT HS256 con solo el usuario (`sub`) y roles leídos en cada petición.**
   Firma simétrica con una clave de runtime; la base sigue siendo la autoridad
   de los roles. Seleccionada.
4. **JWT RS256 / proveedor externo (SSO institucional).** Útil cuando otros
   servicios validen tokens o exista SSO. Hoy hay un solo emisor y un solo
   consumidor; se deja como condición de reapertura.

## Decisión

- **Token:** JWT HS256 firmado con `JWT_SECRET` (al menos 32 bytes; la API no
  arranca sin ella). Reclamos `sub` (id de usuario), `iat` y `exp`. Vigencia
  `JWT_TTL_SEGUNDOS`, por defecto 3600 s. No hay token de renovación: al
  vencer, el frontend pide entrar de nuevo (ADR 0011).
- **Contraseñas:** Argon2id con los parámetros por defecto de `argon2-cffi`.
  El login verifica contra un hash señuelo cuando el correo no existe y
  responde el mismo 401 para correo inexistente, contraseña errónea o cuenta
  inactiva.
- **Principal por petición:** `shared/seguridad.py:contexto_actual` lee la
  cabecera `Authorization` y delega en un resolvedor que registra el
  composition root (`app/main.py`) con `identity.public.principal_desde_token`,
  para que `shared` no importe ningún módulo (ADR 0001). El resolvedor valida
  el token y lee el usuario activo y sus `usuario_roles` con el contexto del
  propio usuario (lo único que RLS le deja ver). Un rol de tienda con
  `tienda_id` NULL se expande a todas las tiendas.
- **Sin cabecera = anónimo; cabecera inválida = 401.** Un token vencido o
  alterado nunca degrada a anónimo: el 401 hace que el frontend cierre la
  sesión (ADR 0011, regla 3).
- **Rutas protegidas:** dependencia `requiere_usuario`, que además declara
  `bearerAuth` en OpenAPI. Las rutas públicas no declaran seguridad, así que el
  contrato de catálogo e inventario no cambia.
- **Alta:** `POST /identity/register` crea siempre un `comprador` mediante la
  función SECURITY DEFINER. Los demás roles los asigna un `admin_general`. El
  primero se crea en la siembra si se definen `SEED_ADMIN_CORREO` y
  `SEED_ADMIN_PASSWORD`, y volver a sembrar no cambia su contraseña.
- **`UserOut`** devuelve `roles: [{codigo, tienda_id}]` en lugar del `rol`
  único (`admin`/`cliente`) del contrato de diseño. Manda el modelo de roles
  del ADR 0013. Es una ruptura para el frontend, coordinada con la API `0.4.0`
  (ADR 0002).

## Consecuencias

**Positivas**

- Retirar un rol o desactivar una cuenta surte efecto en la siguiente
  petición: los roles no viajan en el token.
- RLS recibe el principal real; las políticas del ADR 0014 dejan de ver solo
  peticiones anónimas.
- No hay estado de sesión en el servidor: varias réplicas validan con la misma
  clave.

**Negativas y riesgos**

- Una consulta adicional por petición autenticada (perfil y roles), en una
  transacción corta propia.
- Sin lista de revocación: un token robado vale hasta que vence o hasta que se
  desactive la cuenta. Se mitiga con la vigencia corta y con la desactivación,
  que sí es inmediata.
- Rotar `JWT_SECRET` invalida todas las sesiones a la vez.
- El token sigue en `localStorage` (ADR 0011). Las `notas` por ítem, que son
  contenido de usuario, quedan aplazadas porque reabrirían ese ADR.

## Condiciones de reapertura

1. Se integre SSO institucional o un segundo servicio deba validar tokens: pasar
   a RS256/JWKS o a OIDC.
2. Se migre la sesión a cookie `httpOnly` (reapertura del ADR 0011): el mismo
   JWT puede viajar en la cookie, pero hay que añadir protección CSRF.
3. La consulta de roles por petición aparezca como cuello de botella medible.

## Revisión humana pendiente

El equipo debe ratificar o rechazar esta propuesta y cambiar su estado.
