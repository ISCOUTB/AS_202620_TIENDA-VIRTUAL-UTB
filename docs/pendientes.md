# Pendientes

**Última revisión: 2026-10-04.** El despliegue vigente es el stack de Dokploy
descrito en [`despliegue-dokploy.md`](despliegue-dokploy.md).

## Despliegue

- Crear el servicio Docker Compose en Dokploy con path
  `./deploy/compose.lab.yaml` y definir `POSTGRES_PASSWORD`.
- Asignar el dominio definitivo al servicio `frontend`, puerto 3000, y registrar
  aquí y en el README la URL resultante.
- Configurar una copia periódica del volumen `postgres_data` hacia almacenamiento
  externo y documentar una restauración de prueba.
- Dar de baja manualmente los recursos anteriores en Render, Vercel y Neon
  después de verificar Dokploy. La eliminación de sus archivos en este
  repositorio no elimina recursos remotos ni cargos asociados.
- Rotar o revocar cualquier credencial de Neon compartida anteriormente, aunque
  el proveedor ya no forme parte del sistema.

## Equipo y calidad

- Crear `SONAR_TOKEN` si se mantendrá el análisis de SonarCloud en CI.
- **SonarCloud no está analizando este repositorio.** El último análisis del
  proyecto `ISCOUTB_AS_202620_TIENDA-VIRTUAL-UTB` (organización `isco-utb`) es
  del 2026-10-19 y los pushes posteriores no producen ni el check
  `SonarCloud Code Analysis` ni un análisis nuevo. Mientras siga así, el
  Quality Gate no se puede evaluar sobre el código que se Mergea.
- **Hallazgos de SonarCloud abiertos, con su solución.** El Quality Gate del
  2026-10-19 está en `ERROR` por `new_security_rating = 3`; el resto de
  condiciones (`new_reliability_rating`, `new_maintainability_rating`,
  `new_duplicated_lines_density`, `new_security_hotspots_reviewed`) están en
  `OK`.

  | Regla | Dónde | Solución |
  |---|---|---|
  | `githubactions:S6505` (vulnerabilidad MAJOR) | `.github/workflows/tests.yml` | `npm ci --ignore-scripts` — **aplicado en este PR**; era el único hallazgo dentro del periodo de fuga y el que bloqueaba el gate. |
  | `docker:S6505` (vulnerabilidad MAJOR) | `frontend/Dockerfile` | `RUN npm ci --ignore-scripts` — **aplicado en este PR**. |
  | `python:S8409` (code smell MINOR) | `backend/app/modules/inventory/router.py` y `backend/app/modules/catalog/router.py` | Quitar el `response_model=...` de la ruta: FastAPI ya lo infiere de la anotación de retorno. |
  | `python:S8410` (code smell MINOR) | `backend/app/modules/inventory/router.py`, `backend/app/modules/catalog/router.py` y `backend/app/main.py` | `def f(db: Annotated[Session, Depends(get_session)])` en lugar de `= Depends(...)` como valor por defecto. |
  | `python:S9073` (code smell MAJOR) | `backend/tests/contract/test_openapi.py` | Partir `assert method == "get" and "{" not in path` en dos `assert`. |
  | `python:S5778` (code smell MAJOR) | `backend/tests/contract/test_openapi.py` | Sacar la construcción del validador fuera del `with pytest.raises(...)`: dentro debe quedar una sola invocación. |
  | `docker:S6505` / `docker:S8541` / `docker:S8544` (vulnerabilidades MAJOR) | `backend/Dockerfile` | `pip install --no-cache-dir --only-binary :all: --require-hashes -r requirements.txt` con un archivo de requisitos con hashes. |
  | `githubactions:S8544` (vulnerabilidad MAJOR) | `.github/workflows/tests.yml` (job `backend`) | Igual que lo anterior, pero en el runner: `--require-hashes` sobre un archivo de requisitos con hashes. |

  Los cuatro últimos necesitan tocar el backend (archivos de requisitos con
  hashes y los routers/tests del backend), así que quedan fuera del alcance del
  rediseño del frontend.

- Registrar la prueba de carga concurrente de aproximadamente cinco sesiones.
- Definir migraciones con Alembic antes de introducir cambios destructivos de
  esquema; actualmente el arranque usa `Base.metadata.create_all`.
- Reforzar mediante pruebas las reglas de dependencia entre módulos.
- Implementar los módulos `identity`, `inventory` y `orders`, todavía vacíos.

## Datos de la cafetería (frontend)

- **Precios de Antojos, Punto Fit y Alegría.** Hoy se publican como
  «precio de referencia» y las tres tiendas quedan con `noindex`. Al
  confirmarlos hay que actualizar `frontend/lib/catalogo.ts` (poner
  `esMuestra: false`) y `frontend/lib/tiendas.ts` (`indexable: true`).
  Mientras sean de referencia, el `sitemap.xml` las excluye.
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
- **Dominio público.** `NEXT_PUBLIC_SITIO_URL` debe definirse en el build de
  producción; mientras no exista, `sitemap.xml`, `robots.txt` y las URLs
  canónicas apuntan a `http://localhost:3000`.

## Contrato que el frontend espera

Ver [`api/tiendas-catalogo.md`](api/tiendas-catalogo.md). Resumen:

- `ProductOut` necesita `tienda`, `categoria`, `presentacion` y
  `precio_confirmado`.
- `OrderItemRequest` necesita `notas` para los sabores.
- `OrderCreateRequest` necesita `hora_recogida`.
- Faltan `identity/*` (login, registro, me), `orders` y el `PATCH` de
  inventario. Mientras no existan, el frontend los marca como `preview` o los
  resuelve en modo demostración visible (ADR 0011).
