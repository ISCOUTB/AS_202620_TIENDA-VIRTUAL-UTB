# Seguridad: amenazas, dependencias y privacidad

Entrega con tres partes: (1) tabla de amenazas priorizadas con mitigación
asignada, (2) resultado del análisis de dependencias y (3) sección de
privacidad.

- **Fecha:** 2026-11-01 · **Código:** rama `main`, commit `647bcbd` (API 0.5.0).
- Cada fila cita el archivo del repositorio que la sustenta. Lo deducido del
  código sin ejecutarlo se marca como *inferido*.

## 1. Tabla de amenazas priorizadas con mitigación asignada

**Criterio de prioridad:** riesgo = probabilidad (P) × impacto (I), cada uno de
1 a 3, teniendo en cuenta los controles que ya existen. Riesgo 6–9 alto, 3–4
medio, 1–2 bajo. Categoría STRIDE entre paréntesis: S suplantación, T
manipulación, R repudio, I divulgación, D denegación de servicio, E elevación
de privilegios. La API no se publica: el navegador llega a ella por el proxy
same-origin del frontend (`frontend/lib/api/proxy.ts`, ADR 0012), así que las
amenazas externas entran por esa frontera.

| # | Amenaza (STRIDE) | Evidencia en el repositorio | P | I | Riesgo | Mitigación asignada | Dónde / cuándo | Estado |
|---|---|---|---|---|---|---|---|---|
| A-01 | **Fuerza bruta y relleno de credenciales** contra el login (S) | `POST /identity/login` no limita intentos ni por correo ni por origen (`backend/app/modules/identity/router.py:63`); no hay ningún limitador en `backend/app` ni en el proxy | 3 | 3 | **9** | Limitar a 5 intentos fallidos por correo cada 15 min y por IP en el proxy, que es quien ve la IP real; responder `429` con `Retry-After`. Prueba que haga 6 intentos y espere `429` | Proxy `frontend/lib/api/proxy.ts` + Identidad · incremento 0.6.0 | Pendiente |
| A-02 | **Robo del token por XSS** (I, S) | El JWT y el perfil (nombre, correo) viven en `localStorage` (`frontend/lib/sesion.ts:94-95`, ADR 0011). `next.config.ts` no define cabeceras de seguridad: sin `Content-Security-Policy`, `X-Frame-Options` ni `X-Content-Type-Options` | 2 | 3 | **6** | (1) Añadir `headers()` en `next.config.ts` con CSP `default-src 'self'`, `frame-ancestors 'none'`, `nosniff` y `Referrer-Policy`. (2) Completar el ADR 0011: el proxy guarda el token en cookie `httpOnly; Secure; SameSite=Strict` y lo traduce a `Authorization`. Atenuante actual: token de 1 h y React escapa la salida | Frontend · 0.6.0 (cabeceras), 0.7.0 (cookie) | Pendiente |
| A-03 | **Agotamiento de CPU y memoria en el login** (D) | Cada intento ejecuta Argon2id con los parámetros por defecto de `argon2-cffi` (~64 MiB por verificación, `backend/app/modules/identity/contrasenas.py`), también para correos inexistentes por el hash señuelo. Sin límite de intentos, una ráfaga satura el contenedor | 2 | 2 | 4 | La misma limitación de A-01 + límites de CPU y memoria del servicio `backend` en Dokploy | Proxy + despliegue · 0.6.0 | Pendiente |
| A-04 | **Dependencias con vulnerabilidades conocidas** (T, cadena de suministro) | Ver §2: 0 hallazgos en Python; 13 en npm, ninguno en el código que corre en producción | 2 | 2 | 4 | Fijar `postcss >= 8.5.23` con `pnpm.overrides`; subir `vitest` a `>= 4.1.12`; añadir `pip-audit` y `pnpm audit --prod --audit-level high` al workflow y activar Dependabot | CI `.github/workflows/tests.yml` · 0.6.0 | Pendiente |
| A-05 | **Token robado válido hasta vencer** (S) | No hay revocación del JWT ni cierre de sesión en el servidor (`backend/app/modules/identity/tokens.py`) | 2 | 2 | 4 | Ya implementado: roles y `activo` se leen de la base en cada petición, así que desactivar la cuenta o quitar un rol corta el acceso al instante (`identity/public.py:29`). Pendiente: TTL de 15 min con renovación al migrar a cookie (A-02) y procedimiento de rotación de `JWT_SECRET` en el runbook | Identidad · 0.7.0 | Parcial |
| A-06 | **Repudio de acciones administrativas** (R) | Pedidos e inventario guardan autor (`pedido_historial.usuario_id`, `inventory/models.py:70`). Los cambios de catálogo (precio, activo) no guardan quién los hizo y los logins no se registran | 2 | 2 | 4 | Log estructurado `auth_login` con resultado y `usuario_id` (nunca contraseña ni correo completo) en `shared/logging.py`; columna de autor o tabla de historial para productos | Identidad + Catálogo · 0.6.0 | Pendiente |
| A-07 | **Endpoints operativos expuestos por el proxy** (I) | El proxy reenvía cualquier ruta (`urlDeLaApi` en `frontend/lib/api/proxy.ts`), así que `/api/proxy/metrics`, `/api/proxy/docs` y `/api/proxy/openapi.json` son públicos (*inferido*). `/metrics` muestra rutas, volúmenes y latencias | 3 | 1 | 3 | Lista blanca de prefijos en el proxy (`identity`, `catalog`, `inventory`, `orders`, `health`); `404` para el resto. Prueba unitaria del proxy | Frontend · 0.6.0 | Pendiente |
| A-08 | **Acceso a datos de otra tienda u otro comprador** (E, I) | Mitigada en dos capas: comprobación en el router (`shared/seguridad.py:38-51`) y políticas RLS en PostgreSQL (`alembic/versions/0002_politicas_rls.py`, `0004_admin_general_supervisa.py`) con contexto por transacción. Cubierta por `tests/test_rls.py` (13 pruebas) y `tests/test_admin_por_tienda.py` | 1 | 3 | 3 | Mantener: toda tabla nueva entra con `ENABLE` + `FORCE ROW LEVEL SECURITY` y su prueba en `test_rls.py` | Todos los módulos · continuo | Implementada |
| A-09 | **Falsificación de tokens** (S) | `JWT_SECRET` de al menos 32 bytes o la API no arranca; algoritmo fijado a HS256 y `sub`, `exp`, `iat` obligatorios (`identity/tokens.py:16-59`) | 1 | 3 | 3 | Mantener. Documentar la rotación del secreto (ver A-05) | Identidad · continuo | Implementada |
| A-10 | **Inyección SQL** (T, E) | Consultas con el ORM o con `text()` y parámetros enlazados (`shared/seguridad.py:56-82`, `identity/repository.py:51`); la API se conecta con un rol sin privilegios de dueño, sujeto a RLS (`deploy/postgres/initdb/10-rol-aplicacion.sh`) | 1 | 3 | 3 | Mantener; Ruff y SonarCloud en CI. Prohibido interpolar cadenas en `text()` | Backend · continuo | Implementada |
| A-11 | **Filtración de secretos** (I) | `.env` ignorado por git; `.env.example` sin valores; `compose.yaml` falla si falta una clave (`${VAR:?}`); el CI usa claves desechables | 1 | 3 | 3 | Activar *secret scanning* y *push protection* de GitHub en el repositorio | Repositorio · 0.6.0 | Parcial |
| A-12 | **Enumeración de cuentas** (I) | El login no revela si el correo existe (mismo mensaje y hash señuelo, `identity/contrasenas.py:7-9`), pero el registro responde `409 «El correo ya está registrado»` (`identity/router.py:55`) | 2 | 1 | 2 | Riesgo aceptado por usabilidad; queda acotado por la limitación de A-01 aplicada también a `/identity/register` | Identidad · 0.6.0 | Aceptado |
| A-13 | **Lectura de archivos arbitrarios al importar datos de legado** (I, T) | `python -m app.seed --desde-json` aceptaba cualquier ruta. Corregido: solo un nombre `.json` dentro de `backend/datos_legado`, sin `..`, rutas absolutas ni enlaces simbólicos (`backend/app/archivos_legado.py:18-29`); 10 pruebas en `backend/tests/test_archivos_legado.py`. Diagnóstico en `docs/seguridad-importacion-legado.md` | 1 | 2 | 2 | Mantener; la carpeta se monta en solo lectura en el contenedor | Backend (siembra) · continuo | Implementada |

**Orden de ataque:** A-01 y A-03 se resuelven con el mismo cambio y son el
riesgo más alto; luego A-02 (cabeceras primero, cookie después) y A-07, que
son cambios pequeños en el frontend; A-04 cierra el ciclo dejando la auditoría
de dependencias dentro del CI.

## 2. Resultado del análisis de dependencias

Ejecutado el 2026-11-01 sobre `a8a586a`. Entre ese commit y `647bcbd` no cambió
`backend/requirements*.txt` ni `frontend/pnpm-lock.yaml`, así que el resultado vale para `main`.

| Ecosistema | Herramienta | Alcance | Paquetes analizados | Hallazgos |
|---|---|---|---|---|
| Python (API) | `pip-audit` 2.10.1 (base PyPA / OSV) | `backend/requirements-dev.txt`, incluye transitivas | 49 | **0** |
| Node (frontend) | `pnpm audit` 9.15.0 (GitHub Advisory DB) | `frontend/pnpm-lock.yaml` | 561 | **13**: 2 críticos, 2 altos, 9 moderados (10 avisos en 6 paquetes) |

Reproducir:

```bash
cd backend && pip-audit -r requirements-dev.txt
cd frontend && pnpm audit
```

### 2.1 Hallazgos del frontend y su exposición real

La severidad del aviso no basta para priorizar: importa si el código
vulnerable corre en producción y si un atacante controla su entrada.

| Paquete (versión) | Avisos | Severidad | Llega por | ¿Corre en producción? | Exposición | Acción |
|---|---|---|---|---|---|---|
| `tinypool` 1.1.1 | GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr (contaminación de prototipo → RCE) | Crítica | `vitest` 3.2.7 | No: solo pruebas en CI | Baja: las opciones del pool las fija la configuración del repo | Subir `vitest` a ≥ 4.1.12 |
| `vitest`, `@vitest/mocker` 3.2.7 | GHSA-82fw-gwwq-j7x9 (lectura de archivos), GHSA-qxg6-89mg-rqv8 (inyección de código en mocks) | Moderada | Dependencia de desarrollo | No | Baja: afecta al servidor de pruebas, que no se expone | Mismo cambio |
| `postcss` 8.4.31 | GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 (lectura de `.map` vía `sourceMappingURL`); GHSA-fxqj-rqcc-2cmp; GHSA-qx2v-qp2m-jg93 (XSS en la salida) | 2 altas, 2 moderadas | `next` 15.5.28 | No: procesa CSS durante `next build`; la imagen `standalone` no lo ejecuta (*inferido* de `frontend/Dockerfile`) | Baja: el CSS procesado es el del repositorio, no lo aporta un usuario | `pnpm.overrides` a `postcss >= 8.5.23` y comprobar `pnpm run verify` |
| `minimatch` 3.1.5 / 9.0.9 / 10.2.6 | GHSA-g3hv-75wg-m249 (denegación de servicio) | Moderada | `eslint` | No | Nula: los patrones los escribe el equipo | Se resuelve al actualizar `eslint` |
| `glob` 10.5.0 | GHSA-3g3m-2fjr-6pw4 | Moderada | `@vitest/coverage-v8` | No | Nula | Se resuelve con `vitest` 4 |

**Conclusión:** ningún hallazgo afecta al código que atiende peticiones en
producción. El riesgo es de cadena de suministro en el CI y en el build, y por
eso A-04 tiene riesgo medio y no alto.

### 2.2 Controles de cadena de suministro que ya existen

- Versiones fijadas: `==` en `backend/requirements.txt` y `pnpm-lock.yaml`
  con `--frozen-lockfile` en CI.
- `pnpm install --ignore-scripts`: ningún `postinstall` transitivo se ejecuta
  en el runner (`.github/workflows/tests.yml`).
- `pip install --only-binary :all:`: no se compila código de paquetes durante
  la instalación.
- La acción de SonarCloud está fijada por SHA y no por etiqueta.
- Las imágenes corren con usuario sin privilegios (`USER app` en
  `backend/Dockerfile`, `USER nextjs` en `frontend/Dockerfile`).

**Limitación conocida:** `pip-audit` se ejecutó con Python 3.14 local; la imagen
usa 3.12. Con todas las dependencias directas fijadas, la resolución de
transitivas puede variar en algún paquete. Al llevar la auditoría al CI
(A-04) correrá con la misma versión que la imagen.

## 3. Sección de privacidad

Marco: **Ley 1581 de 2012** (habeas data) y su reglamentación (Decreto 1377 de
2013, compilado en el Decreto 1074 de 2015). Responsable declarado: la UTB, en
la página `/privacidad` (`frontend/app/(public)/privacidad/page.tsx`).

### 3.1 Inventario de datos personales

| Dato | Dónde vive | Finalidad | Quién lo ve | Conservación hoy |
|---|---|---|---|---|
| Nombre y correo | `usuarios.nombre`, `usuarios.correo` | Cuenta e identificación en el mostrador | El titular (`GET /identity/me`); RLS impide que otro comprador lo lea | Indefinida |
| Contraseña | `usuarios.hash_contrasena`, Argon2id | Autenticación | Nadie: hash irreversible, nunca sale de la API | Indefinida |
| Roles y tienda | `usuario_roles` | Autorización | Titular y administración | Indefinida |
| Pedidos | `pedidos` (`usuario_id`, total, hora de recogida), `pedido_lineas` | Ejecutar el pedido | Titular y la tienda del pedido (RLS) | Indefinida; los `pendiente_pago` se cancelan a las 24 h (`app/tareas/vencer_pedidos.py`), pero no se borran |
| Texto libre | `pedido_lineas.notas` (140), `pedido_historial.comentario` (200) | Indicaciones al mostrador | Titular y tienda | Indefinida; puede contener datos que el titular escriba |
| Sesión en el navegador | `localStorage`: `tvutb.token`, `tvutb.usuario` (nombre, correo) | Mantener la sesión | Solo el propio navegador | Se borra al cerrar sesión o al vencer (`frontend/lib/sesion.ts:108-110`) |
| Registros técnicos | stdout de la API: método, ruta, estado y latencia (`shared/metrics.py:64-72`) | Diagnóstico y disponibilidad | Equipo con acceso a Dokploy | Lo que retenga Dokploy; no está configurado |

**Minimización ya aplicada:** el log por petición no guarda cuerpo, cabeceras,
token ni la IP del cliente; el proxy no reenvía la cookie del navegador a la
API (`frontend/lib/api/proxy.ts`); no se recogen datos sensibles ni medios de
pago (no hay pasarela: el pago se hace en el mostrador).


### Derechos del titular e incidentes

- **Canal:** correo indicado en `/privacidad` con el asunto «Datos
  personales». Plazos legales: consultas en 10 días hábiles, prorrogables 5
  (art. 14); reclamos en 15 días hábiles, prorrogables 8 (art. 15). La
  página ya los publica.
- **Acceso desde el producto:** `GET /identity/me` devuelve todo el perfil
  guardado; rectificar y suprimir dependen de P-02 y P-03.
- **Incidentes:** si se filtran datos personales (por ejemplo, por A-01 o
  A-02), el responsable debe reportarlo a la Superintendencia de Industria y
  Comercio dentro de los 15 días hábiles siguientes a su detección y avisar a
  los titulares afectados. La contención técnica disponible es rotar
  `JWT_SECRET`, que invalida todas las sesiones de inmediato, y desactivar
  cuentas (`usuarios.activo`).
