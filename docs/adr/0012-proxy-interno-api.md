# ADR 0012: Proxy interno same-origin del frontend hacia la API, en lugar de publicar el backend

- **Estado:** Propuesta — pendiente de ratificación
- **Fecha:** 2026-10-21
- **Contexto de la decisión:** frontend de la tienda desplegado en Dokploy.
  Relacionado con el [ADR 0002](0002-contrato-integracion-http.md) (contrato
  HTTP), el [ADR 0007](0007-despliegue-dokploy.md) (despliegue unificado) y el
  [ADR 0011](0011-sesion-localstorage.md) (sesión del frontend).

## Contexto

El frontend llama a la API desde el navegador para el acceso y los pedidos. El
backend corre en la misma red privada del Compose (`http://backend:8000`) y, por
decisión de arquitectura, **no se publica con dominio propio**: el Compose de
Dokploy no expone puertos del host y solo el frontend recibe tráfico público.

El problema es que el navegador no puede conocer esa URL interna. En el bundle
de cliente, Next.js inyecta un shim de `process` cuyo `env` va **vacío**:
solo las variables `NEXT_PUBLIC_*` se hornean durante el build, y `API_URL` es
precisamente una variable de runtime, inyectada en el contenedor para que la
imagen no lleve ninguna URL de la API.

El efecto fue medido en el bundle de producción y reproducido en el navegador:
la petición de acceso salía hacia `http://localhost:8000`, es decir, el
`localhost` del visitante. La respuesta era un error de red, que la sesión
interpretaba como «la API no responde» y degradaba a **modo demostración**
(ADR 0011): el sitio parecía funcionar, pero el acceso no autenticaba y la
reserva siempre terminaba en «Reserva simulada».

Restricciones relevantes:

- La API no debe exponerse: es la decisión vigente del despliegue.
- `API_URL` debe seguir siendo un secreto de runtime; no puede hornearse en la
  imagen.
- No hay CDN ni punto de entrada distinto del contenedor de Next.js.
- El contrato HTTP y sus rutas (`/identity/*`, `/orders`, `/catalog/*`) no
  cambian; cambia solo el modo de llegar a ellas.
- El navegador y la API pueden vivir en orígenes distintos, así que una llamada
  directa exigiría CORS y expondría la URL interna.

## Alternativas consideradas

### A. Publicar el backend con su propio dominio

- Ventaja: es la solución trivial; el navegador llama a `https://api…/identity/login`
  y la API necesita CORS.
- Desventaja: contradice la decisión de arquitectura del despliegue, expone una
  superficie que hoy no existe, obliga a configurar CORS y deja de ser cierto
  que «solo el frontend recibe tráfico público». Además obliga a hornear
  `NEXT_PUBLIC_API_URL` en el bundle, con lo que la URL de la API pasa a ser
  pública y a quedar congelada en cada imagen.

### B. Hornear `API_URL` en el bundle como `NEXT_PUBLIC_API_URL`

- Ventaja: no hace falta proxy; el código del cliente no cambia.
- Desventaja: es la opción A sin sudominio, y además rompe el job de CI: el
  build ocurre sin backend y con una URL de producción dentro del bundle. La
  URL de la API quedaría además congelada en la imagen, igual que el dominio
  del sitio.

### C. Proxy interno en Next.js, con rutas same-origin

- Ventaja: la API sigue privada; no hay CORS; `API_URL` se sigue leyendo en
  tiempo de ejecución en el servidor; el navegador solo conoce rutas del
  propio origen (`/api/proxy/...`).
- Desventaja: introduce un salto extra y una pieza que hay que mantener; el
  proxy debe reenviar método, cuerpo, cabeceras de autorización e idempotencia,
  ytraducir los errores de conexión sin perder el significado de un 401 real.

### D. Reescribir la API como funciones del propio frontend

- Ventaja: no hay red de por medio.
- Desventaja: duplicaría la lógica del backend en el frontend y rompería el
  contrato HTTP (ADR 0002), que es la base del diseño por incrementos.

## Decisión

Se adopta la **alternativa C**, con estas condiciones:

1. El proxy vive en `frontend/app/api/proxy/[...path]/route.ts`, que es una
   envoltura mínima; la lógica está en `frontend/lib/api/proxy.ts` para que sea
   comprobable sin levantar Next.
2. `/api/proxy/<ruta>` se reenvía a `${API_URL}/<ruta>`, conservando método,
   cuerpo, cadena de consulta y las cabeceras `Authorization`,
   `Idempotency-Key` y `Content-Type`. No se reenvían las de transporte
   (`host`, `connection`, `content-length`, `accept-encoding`) ni la cookie de
   sesión del frontend: la API autentica con `Bearer`.
3. `lib/api/client.ts` es el único consumidor: su base pasa a ser el prefijo
   `/api/proxy`. Ningún componente cambia, y `lib/sesion.ts` y `lib/pedidos.ts`
   siguen igual.
4. Si la API no responde, el proxy devuelve **502** con un `detail` legible. No
   es un error de negocio: `ApiError.esCaida` (0, 502, 503, 504) lo traduce al
   mismo «la tienda no responde» que una conexión rechazada, para que la
   degradación a modo demostración del ADR 0011 siga siendo honesta. Un **401**
   real del backend se propaga tal cual y nunca se disfraza de demostración.
5. `dynamic = "force-dynamic"`: ninguna respuesta del proxy se cachea.

## Consecuencias

**Positivas**

- El acceso y los pedidos funcionan contra la API real sin publicarla ni
  configurar CORS.
- `API_URL` sigue siendo un secreto de runtime: la imagen no lleva ninguna URL
  de la API y el mismo contenedor sirve para cualquier entorno.
- El salto es transparente para la aplicación: un solo módulo conoce el
  prefijo del proxy.
- El 502 del proxy da una señal de disponibilidad mejor que el error de red
  opaco del navegador, y `esCaida` unifica ambos criterios.

**Negativas y riesgos**

- Un salto extra en cada petición a la API; irrelevante a la escala del
  campus, pero es un coste real si el volumen creciera.
- El proxy es un punto de concentración: un fallo suyo afecta a todas las
  funciones de compra. A cambio, es un punto único y fácil de observar.
- Se amplía la superficie del servidor: el proxy reenvía peticiones sin
  validar su contenido. Solo reenvía lo que el propio frontend genera, y el
  backend sigue siendo quien valida el token y los datos.

## Condiciones de reapertura

Este ADR se revisa cuando:

1. El backend pase a servirse con su propio dominio y CORS estricto: la
   alternativa A volvería a ser la más simple y habría que retirar el proxy.
2. `API_URL` deje de ser un secreto y pase a ser pública por decisión de
   plataforma: la alternativa B sería suficiente y sin saltos extra.
3. El frontend deje de hablar con la API desde el navegador (renderizado en
   el servidor con sesión en cookie, según las condiciones de reapertura del
   ADR 0011): el proxy dejaría de tener sentido para el cliente.
