# Pendientes

**Última revisión: 2026-10-24.** El despliegue vigente es el stack de Dokploy
descrito en [`despliegue-dokploy.md`](despliegue-dokploy.md).

## Despliegue

- Crear el servicio Docker Compose en Dokploy con path
  `./deploy/compose.lab.yaml` y definir `POSTGRES_PASSWORD`.
- **Asignar el dominio definitivo al servicio `frontend`, puerto 3000, y
  registrarlo aquí y en el README.** El vigente es
  `https://tiendautb-sistema-n0ojjk-fde272-144-24-4-187.sslip.io/`, que genera
  la plataforma (`sslip.io` resuelve el nombre hacia la IP del servidor) y es
  temporal: para la entrega conviene registrar un dominio propio y apuntarlo
  por DNS.
- **Emitir el certificado del dominio.** Traefik está sirviendo su certificado
  autofirmado (*TRAEFIK DEFAULT CERT*), así que el navegador avisa de que la
  conexión no es privada. Hay que habilitar Let's Encrypt para ese dominio en
  *Domains*.
- Configurar una copia periódica del volumen `postgres_data` hacia almacenamiento
  externo y documentar una restauración de prueba.
- Dar de baja manualmente los recursos anteriores en Render, Vercel y Neon
  después de verificar Dokploy. La eliminación de sus archivos en este
  repositorio no elimina recursos remotos ni cargos asociados.
- Rotar o revocar cualquier credencial de Neon compartida anteriormente, aunque
  el proveedor ya no forme parte del sistema.

## Equipo y calidad

- Crear `SONAR_TOKEN` si se mantendrá el análisis de SonarCloud en CI.
- **SonarCloud no analiza las ramas de este repositorio.** La app de SonarCloud
  sí está instalada y sí publica el check `SonarCloud Code Analysis` (aparece
  en los commits de `main`), pero **Automatic Analysis solo analiza la rama por
  defecto**: el historial de análisis del proyecto no tiene ni una sola rama
  distinta de `main`, y `feat/tienda-virtual-frontend` daba
  *Component not found on branch*. La causa es la opción de SonarCloud
  «Disable Automatic Analysis for pull requests from the same repository».
  Consecuencia: el gate **no se puede evaluar sobre un PR de este mismo
  repositorio**; solo se evalúa tras fusionar a `main`.
  **Estado tras el PR #1 (fusionado el 2026-10-21):** el token del repositorio
  pertenece a la cuenta automática `pxtroniwnl-wokg8@github`, que **no es
  miembro de la organización `isco-utb` ni tiene el permiso «Execute
  analysis»**; por eso el job `sonarcloud` de CI falla y el Análisis Automático
  tampoco volvió a reportar (el último análisis sigue siendo el del 2026-10-19,
  previo a este trabajo). En `main` el único check rojo es `sonarcloud`;
  `backend` y `frontend` están en verde.
  Para que el gate vuelva a evaluarse hay que pasar al análisis desde CI:
  1. Crear en SonarCloud un token con permiso de análisis
     (*My Account → Security → Generate tokens*, marca *Execute analysis*),
     desde una cuenta que **sea miembro de `isco-utb`**. Si es la misma cuenta
     que administra la organización, la vía directa es *Scoped Organization
     Tokens* → *Execute analysis for all projects in the organization* (solo
     en planes Team o Enterprise).
  2. Guardarlo como secreto del repositorio: `gh secret set SONAR_TOKEN`.
  3. En SonarCloud → *Administration → General settings → Analysis Method*,
     desactivar *Automatic Analysis* para que no analice dos veces el mismo
     commit (el job de CI ya está listo: clave, fuentes, pruebas, cobertura
     lcov y `fetch-depth: 0` para el cálculo de código nuevo).
  Con eso el job `sonarcloud` publica el check y el estado del Quality Gate en
  cada push, y se puede exigir que esté verde.
- **Hallazgos de SonarCloud abiertos, con su solución.** El Quality Gate del
  2026-10-19 está en `ERROR` por `new_security_rating = 3`; el resto de
  condiciones (`new_reliability_rating`, `new_maintainability_rating`,
  `new_duplicated_lines_density`, `new_security_hotspots_reviewed`) están en
  `OK`.

  | Regla | Dónde | Solución |
  |---|---|---|
  | `githubactions:S6505` (vulnerabilidad MAJOR) | `.github/workflows/tests.yml` | `npm ci --ignore-scripts` — **aplicado en este PR**; era el único hallazgo dentro del periodo de fuga y el que bloqueaba el gate. |
  | `docker:S6505` (vulnerabilidad MAJOR) | `frontend/Dockerfile` | `RUN npm ci --ignore-scripts` — **aplicado en este PR**. |
  | `python:S8409` (code smell MINOR) | `backend/app/modules/inventory/router.py` y `backend/app/modules/catalog/router.py` | Quitar el `response_model=...` de la ruta: FastAPI ya lo infiere de la anotación de retorno. **Aplicado el 2026-10-24.** En `main.py`, `/health` y `/health/ready` lo conservan porque no es redundante (devuelven `dict` y `JSONResponse`). |
  | `python:S8410` (code smell MINOR) | `backend/app/modules/inventory/router.py`, `backend/app/modules/catalog/router.py` y `backend/app/main.py` | `def f(db: Annotated[Session, Depends(get_session)])` en lugar de `= Depends(...)` como valor por defecto. **Aplicado el 2026-10-24** (también en los routers nuevos). |
  | `python:S9073` (code smell MAJOR) | `backend/tests/contract/test_openapi.py` | Partir `assert method == "get" and "{" not in path` en dos `assert`. **Aplicado el 2026-10-24.** |
  | `python:S5778` (code smell MAJOR) | `backend/tests/contract/test_openapi.py` | Sacar la construcción del validador fuera del `with pytest.raises(...)`: dentro debe quedar una sola invocación. **Aplicado el 2026-10-24.** |
  | `docker:S6505` / `docker:S8541` / `docker:S8544` (vulnerabilidades MAJOR) | `backend/Dockerfile` | `pip install --no-cache-dir --only-binary :all: --require-hashes -r requirements.txt` con un archivo de requisitos con hashes. |
  | `githubactions:S8544` (vulnerabilidad MAJOR) | `.github/workflows/tests.yml` (job `backend`) | Igual que lo anterior, pero en el runner: `--require-hashes` sobre un archivo de requisitos con hashes. |

  Quedan abiertos los tres de `--require-hashes` (`backend/Dockerfile` y el
  job `backend` de CI): piden generar un archivo de requisitos con hashes
  (p. ej. `uv pip compile --generate-hashes`) y mantenerlo al actualizar
  dependencias.

- Registrar la prueba de carga concurrente de aproximadamente cinco sesiones.
  Avance del 2026-10-24: las E2E de TestSprite (~30 navegadores) agotaban el
  pool y colgaban la API; corregido con `RutaConSesion`
  (`backend/app/shared/database.py`, cubierto por `tests/test_concurrencia.py`).
  Ráfagas locales de 300 peticiones mixtas: 300/300 en 200.
- ~~Definir migraciones con Alembic~~ — hecho el 2026-10-22
  ([ADR 0013](adr/0013-migraciones-alembic-y-esquema.md)) junto con RLS
  ([ADR 0014](adr/0014-seguridad-rls.md)). Queda por hacer en cada entorno
  existente (local y Dokploy): definir `APP_DB_PASSWORD`, crear el rol de
  aplicación en la base ya inicializada, **exportar los datos anteriores**
  antes de que el servicio `migrate` aplique `0001_esquema_inicial` (borra
  `catalog_products` e `inventory_stock`) y ejecutar la siembra (o
  `SEED_ON_DEPLOY=true`). Pasos en el README.
- Reforzar mediante pruebas las reglas de dependencia entre módulos.
- ~~Implementar los endpoints de `identity`~~ — hecho el 2026-10-24
  ([ADR 0016](adr/0016-autenticacion-jwt.md)): registro, login con JWT,
  `/identity/me` y `contexto_actual` entrega el usuario a RLS. En cada entorno
  hay que definir `JWT_SECRET` (la API no arranca sin ella) y, para el primer
  administrador, `SEED_ADMIN_CORREO`/`SEED_ADMIN_PASSWORD` con
  `SEED_ON_DEPLOY=true`.
- ~~Escrituras de `inventory`~~ — hecho el 2026-10-24: `GET`/`PUT
  /inventory/{productId}` y `POST /inventory/{productId}/adjust`, para
  `responsable_inventario` o `admin_tienda` de la tienda (o `admin_general`),
  con movimiento `ajuste` y bloqueo optimista (409).
- ~~Implementar los endpoints de `orders`~~ — hecho el 2026-10-24
  ([implementación de la saga](idempotencia-saga-s11.md#4-implementación-2026-10-24)).
  En Dokploy falta crear el *Schedule* de `python -m app.tareas.vencer_pedidos`
  ([pasos](despliegue-dokploy.md#vencimiento-de-pedidos-sin-pago)).

## Datos de la cafetería (frontend)

- **Precios de Antojos, Punto Fit y Alegría.** Hoy se publican como
  «precio de referencia» y las tres tiendas quedan con `noindex`. Al
  confirmarlos, el administrador de cada tienda marca «Precio confirmado» en
  `/admin` (`PATCH /catalog/products/{id}`, `precio_confirmado: true`) y se
  cambia `frontend/lib/tiendas.ts` (`indexable: true`), que sigue siendo
  estático. Mientras sean de referencia, el `sitemap.xml` las excluye.
- **Asignación de las 13 fotos.** Viven en `frontend/public/img/` como
  `cafeteria-01.jpg` … `cafeteria-13.jpg` y no están asociadas a tiendas ni a
  productos. El mapa está vacío en `frontend/lib/imagenes.ts`
  (`FOTO_TIENDA`); mientras tanto cada tienda usa un campo de color con su
  motivo. Al asignarlas se rellenan también los `alt` reales.
- **Horario de la cafetería.** `lib/tiendas.ts` usa de lunes a viernes,
  7:00 a. m. – 8:00 p. m., marcado como provisional. Afecta al estado
  «abierto ahora» y a la pregunta frecuente correspondiente.
- **Dirección exacta del punto.** El `PostalAddress` del JSON-LD solo declara
  ciudad y país; falta la dirección del campus para completarlo.
- **Carta de Almuerzo 02.** Sin productos: la página existe, no se indexa y
  muestra «Carta en preparación».
- **Dominio público.** `NEXT_PUBLIC_SITIO_URL` ya se pasa al build como
  `build.args` desde `deploy/compose.lab.yaml` (con el dominio actual por
  defecto). Cuando se registre el definitivo hay que cambiarlo allí y
  **redesplegar** — la variable queda horneada en el bundle, así que un
  reinicio no basta.

## Contrato que el frontend espera

Ver [`api/tiendas-catalogo.md`](api/tiendas-catalogo.md). Resumen:

- ~~`ProductOut` necesita `tienda`, `categoria`, `presentacion` y
  `precio_confirmado`~~ — hecho en la API `0.4.0` (migración `0003`).
- `OrderItemRequest` necesita `notas` para los sabores. **Aplazado:** son
  contenido de usuario y reabren el ADR 0011 (pasar la sesión a cookie
  `httpOnly`); hacer ambas cosas juntas.
- ~~`OrderCreateRequest` necesita `hora_recogida`~~ — hecho.
- ~~Faltan `identity/*`, `orders` y los ajustes de inventario~~ — hechos en la
  API `0.4.0` y conectados en el frontend el 2026-10-24: catálogo real sin
  caché, «Mis pedidos» con cancelación en `/cuenta` y, en `/admin`,
  inventario, cola de pedidos y alta/edición de productos.

## Aplazado por decisión

- **`notas` por ítem + sesión en cookie `httpOnly` (reabre el ADR 0011).**
  Las notas son contenido de usuario que se imprime en el ticket; aceptarlas
  con el token en `localStorage` amplía el impacto de un XSS. Se hacen juntas:
  mover el JWT a una cookie `httpOnly` del proxy (ADR 0012) con protección
  CSRF, y después añadir `notas` (≤ 140 caracteres) a `OrderItemRequest`.
- **Asignación de roles desde la interfaz.** Hoy un `admin_general` asigna
  `admin_tienda` y `responsable_inventario` directamente en la base
  (`usuario_roles`); no hay endpoint ni pantalla para hacerlo.
