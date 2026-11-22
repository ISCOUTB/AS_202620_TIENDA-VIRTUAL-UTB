# ADR 0011: Sesión del frontend en almacenamiento local y migración pendiente a cookie httpOnly

- **Estado:** Propuesta — pendiente de ratificación
- **Fecha:** 2026-10-21
- **Contexto de la decisión:** frontend de la tienda, incremento de diseño y
  flujo de compra. Relacionado con el [ADR 0002](0002-contrato-integracion-http.md)
  (contrato HTTP) y con el [ADR 0010](0010-no-extraer-modulos.md).

## Contexto

El frontend necesita autenticar al estudiante para habilitar las funciones de
compra (apartar unidades, confirmar una reserva, ver el historial). El contrato
de diseño en `docs/openapi/tienda-virtual.yaml` ya define las rutas
`POST /identity/login`, `POST /identity/register` y `GET /identity/me`, y el
`POST /orders` exige `bearerAuth`.

En el contexto original del 2026-10-21, Identidad todavía no emitía tokens.
Desde el 2026-10-24 el login JWT está implementado (ADR 0016) y el frontend lo
consume. El token sigue en `localStorage`; la cookie `httpOnly` no está implementada.

La pregunta original era dónde guardar el token durante la construcción del
backend. La deuda actual es migrar ese almacenamiento conservando la interfaz
de sesión que consumen los componentes.

Restricciones relevantes:

- El sitio se sirve con `output: standalone` en un contenedor, sin CDN.
- Hay rutas que deben protegerse de la navegación casual (`/cuenta`, `/admin`)
  sin esperar a que React hidrate.
- El middleware de Next corre en el edge y **no puede leer `localStorage`**.
- Un 401 del backend debe cerrar la sesión, nunca simularla.
- Los pedidos son idempotentes por `Idempotency-Key`; la sesión no debe
  introducir un segundo mecanismo de identidad.

## Alternativas consideradas

### A. Cookie `httpOnly` emitida por el backend desde el primer día

- Ventaja: es la opción correcta a largo plazo; el token no es accesible desde
  JavaScript y el middleware puede validarlo.
- Desventaja: **no se puede implementar todavía**. Exige que `identity` exista,
  emita `Set-Cookie`, configure `SameSite`/`Secure` y gestione CSRF. Bloquearía
  todo el flujo de compra hasta que el backend avance.

### B. Token en `sessionStorage`

- Ventaja: se borra al cerrar la pestaña, reduce la exposición.
- Desventaja: el estudiante pierde la sesión al cambiar de pestaña o al volver
  desde el correo, justo en el flujo de recogida. No resuelve nada que
  `localStorage` no resuelva, y empeora la experiencia.

### C. Token en `localStorage` + cookie «pista» no sensible

- Ventaja: funciona hoy, sobrevive a la navegación entre pestañas y permite
  que el middleware redirija sin esperar la hidratación.
- Desventaja: `localStorage` es accesible desde JavaScript, así que un XSS
  podría leer el token. En este incremento no hay contenido generado por
  usuarios ni HTML de terceros, y el token es de corta duración.

### D. No autenticar y dejar todo el flujo en modo demostración

- Ventaja: cero superficie de ataque.
- Desventaja: incumple el requisito de que la sesión habilite la compra y no
  permite validar el contrato de pedidos.

## Decisión

Se adopta la **alternativa C**, con estas condiciones:

1. El token y el usuario se guardan en `localStorage` bajo `tvutb.token` y
   `tvutb.usuario` (`frontend/lib/sesion.ts`).
2. Junto a la sesión se escribe una cookie **sin datos sensibles**
   (`tvutb.sesion=1`, `SameSite=Lax`, `max-age` igual al de la sesión). El
   middleware (`frontend/middleware.ts`) solo comprueba su existencia para
   redirigir a `/auth/ingresar?next=…`.
3. La cookie **no es la frontera de seguridad**. La autoridad es la API: un
   401 dispara `setAlNoAutorizado()` en `lib/api/client.ts`, borra la sesión y
   redirige al acceso con `motivo=expirada`.
4. Los datos de demostración **solo** se usan cuando el endpoint no existe
   (404/405/501) o la API no responde (estado 0). Un 401 real **nunca** se
   convierte en demostración, y la interfaz marca el modo demo en `/cuenta` y
   en la confirmación del pedido.
5. La caducidad se guarda explícitamente (`tvutb.expira`). Al leer, una sesión
   vencida se borra en lugar de reutilizarse.
6. El carrito caduca a las 24 h, alineado con la compensación por TTL de la
   saga de pedidos ([`docs/idempotencia-saga-s11.md`](../idempotencia-saga-s11.md)).

## Consecuencias

**Positivas**

- El flujo completo de compra se puede construir, probar y demostrar sin
  backend de identidad.
- El middleware evita el parpadeo de contenido protegido sin necesidad de
  conocer el token.
- La degradación a modo demostración es explícita y visible, no silenciosa.
- La integración con Identidad ya está en `lib/sesion.ts`; los componentes
  siguen consumiendo `useSesion()`.

**Negativas y riesgos**

- Un XSS podría leer el token. React escapa la salida y el JWT tiene caducidad;
  el stack versionado no configura `Content-Security-Policy`. Esa cabecera y
  la cookie `httpOnly` son mitigaciones pendientes, no controles acreditados.
- La cookie pista puede quedar desincronizada del `localStorage` si el usuario
  borra solo las cookies; en ese caso se le pide entrar de nuevo, lo que es
  seguro aunque molesto.
- La lógica de sesión se duplica conceptualmente (token en cliente, estado en
  middleware). Se documenta aquí para que no se lea como un descuido.

## Condiciones de reapertura

Este ADR se revisa y, previsiblemente, se sustituye cuando:

1. `POST /identity/login` emita una cookie `httpOnly`, `Secure`, `SameSite=Lax`
   (o `Strict`) rotativa.
2. Exista verificación de sesión del lado del servidor (por ejemplo,
   `GET /identity/me` en el layout) que permita renderizar `/cuenta` sin
   depender de JavaScript.
3. Se añada contenido generado por usuarios (reseñas, notas por ítem) o
   cualquier HTML de terceros: en ese momento `localStorage` deja de ser
   aceptable.

El reemplazo esperado es: cookie `httpOnly` + lectura de la sesión en el
servidor + el middleware validando la cookie contra la API (o contra un JWT
firmado), manteniendo `useSesion()` como interfaz del cliente para no tocar los
componentes.
