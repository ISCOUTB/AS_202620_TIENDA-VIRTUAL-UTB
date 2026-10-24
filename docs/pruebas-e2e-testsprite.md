# Pruebas E2E con TestSprite

**Última corrida: 2026-10-24, API 0.5.0. Estado: frontend 77/77, API 36/36.** Este documento cubre qué se probó,
cómo se reproduce, qué falló y por qué, y qué se corrigió. Las pruebas unitarias
y de integración (pytest y vitest) siguen siendo la red principal. Las E2E de
TestSprite las complementan, recorriendo la aplicación real como lo haría una
persona.

## 1. Qué es y qué cubre

[TestSprite](https://www.testsprite.com/) es un servicio que genera y ejecuta
pruebas con un agente que maneja un navegador remoto. Se usa desde Claude Code
como servidor MCP. Abre un túnel hacia el servidor local, así que **prueba la
aplicación que corre en la máquina**, no la desplegada.

- **Frontend:** 77 casos sobre Next.js en modo producción (`next start`). Los
  primeros 39 los generó TestSprite a partir del PRD y del resumen del código.
  Del TC040 al TC077 se escribieron a mano para cubrir:
  - aislamiento entre tiendas y modo supervisión;
  - validaciones de formularios;
  - carrito y límites de stock;
  - búsqueda, rutas y sesión;
  - páginas legales, responsive y tema.
- **API:** 36 casos contra FastAPI en el puerto 8000 (sección 6).

Archivos, en `testsprite_tests/`:

| Archivo | Para qué |
|---|---|
| `PRD-tienda-virtual-utb.md` | PRD que TestSprite usa para entender el producto (cuentas, RF y criterios) |
| `testsprite_frontend_test_plan.json` | Plan de frontend: 77 casos con pasos y aserciones |
| `testsprite_backend_test_plan.json` | Plan de API: 36 casos |
| `code_summary_backend.yaml` | Resumen de la API para generar el plan de backend |
| `testsprite-mcp-test-report.md` | Informe final, caso por caso |
| `preparar_datos.sh` | Recrea la base E2E con datos de demostración antes de cada tanda |
| `TC0xx_*.py` | Código Playwright que generó TestSprite para cada caso |
| `corridas/<fecha>-t<n>/` | Resultados crudos de cada tanda (`test_results.json`, `raw_report.md`) |
| `tmp/` | Configuración y temporales del MCP. **Ignorado por git**: `config.json` guarda la cuenta de prueba |

## 2. Preparar el entorno

Solo con **datos de demostración**. Nunca contra la base de producción.

1. PostgreSQL de pruebas (el mismo contenedor que usa pytest, `tvutb-test-pg`
   en el puerto 55432). La base E2E es `tienda_e2e` y la crea el script.
2. API con el rol de aplicación (RLS activo), en una terminal, desde `backend/`:

   ```bash
   JWT_SECRET=clave-de-pruebas-que-no-se-usa-en-produccion JWT_TTL_SEGUNDOS=14400 \
   DATABASE_URL=postgresql+psycopg2://tienda_app:<clave-local>@localhost:55432/tienda_e2e \
     uvicorn app.main:app --port 8000
   ```

   `JWT_TTL_SEGUNDOS=14400` evita que la sesión venza en mitad de una tanda
   larga.
3. Frontend en **modo producción**. En modo desarrollo TestSprite limita la
   tanda a 15 casos y el servidor de desarrollo se satura. Desde `frontend/`:

   ```bash
   API_URL=http://localhost:8000 pnpm run build
   API_URL=http://localhost:8000 pnpm exec next start -p 3000
   ```

4. Datos, desde la raíz:

   ```bash
   PYTHON=<python con las dependencias de backend> bash testsprite_tests/preparar_datos.sh
   ```

   - Recrea `tienda_e2e`, migra y siembra con `SEED_ADMIN_*` y
     `SEED_TIENDAS_PASSWORD`.
   - Registra a la compradora `ana`.
   - Deja 12 pedidos de ana en Almuerzo 01 y 12 en Antojos, en todos los
     estados. Hay ocho por pagar por tienda porque los casos corren en
     paralelo y varios cancelan o avanzan uno. Los estados los avanza el admin
     de cada tienda.

### Cuentas E2E

Valores **solo para la base E2E local**; no existen en producción.

| Cuenta | Contraseña | Rol |
|---|---|---|
| `ana@utb.edu.co` | `Comprador-2026` | comprador |
| `admin.<tienda>@utb.edu.co` (`antojos`, `punto-fit`, `alegria`, `almuerzo-01`, `almuerzo-02`) | `Tienda-2026` (`CLAVE_TIENDAS`) | `admin_tienda` de esa tienda |
| `admin@utb.edu.co` | `Admin-Demo-2026` | `admin_general`, solo supervisa |

## 3. Correr las tandas

TestSprite ejecuta como mucho **30 casos por corrida** en modo producción, así
que el plan se corre en tandas con `testIds`. Antes de cada tanda se vuelve a
ejecutar `preparar_datos.sh`.

Desde Claude Code, la herramienta MCP `testsprite_generate_code_and_execute`
recibe:

- `serverMode: "production"`;
- `testIds` con los casos de la tanda (TC001–TC030, TC031–TC060, TC061–TC077);
- `additionalInstruction` con las cuentas y las reglas que el agente no puede
  deducir. El texto usado:
  - el admin general solo supervisa;
  - «Cerrado» es informativo;
  - nunca usar el modo demostración;
  - un producto nuevo empieza con 0 unidades;
  - los casos corren en paralelo, así que hay que usar productos distintos y
    comparar cambios relativos.

La herramienta devuelve un comando (`node …/testsprite-mcp/dist/index.js
generateCodeAndExecute`). Ese comando abre el túnel, espera los resultados y
escribe `tmp/test_results.json` y `tmp/raw_report.md`. Cada tanda tarda entre
15 y 30 minutos.

**Costo.** El plan gratuito trae 150 créditos. Cada caso consumió unos 0,4
créditos y cada generación de plan, alrededor de 1. Consultar con
`testsprite_check_account_info`.

## 4. Resultados por corrida

| # | Fecha | Versión | Alcance | Resultado | Qué cambió después |
|---|---|---|---|---|---|
| 1 | 2026-10-24 | 0.4.0 | 30 casos de frontend (plan inicial) | 6/30 | Arreglos del pool, el login y los datos E2E (sección 5) |
| 2 | 2026-10-24 | 0.4.0 + arreglos | 24 casos re-ejecutados | 13/24 | Catálogo fresco, recarga de colas y datos con más pedidos |
| 3 | 2026-10-24 | 0.4.0 + arreglos | 11 casos que seguían fallando | 10/11 | TC019 era un artefacto de la exploración (sección 7) |
| 4 | 2026-10-24 | 0.5.0 | Frontend TC001–TC030 | 28/30 | Bug real en TC021; TC018 tenía una expectativa errónea |
| 5 | 2026-10-24 | 0.5.0 | Frontend TC031–TC060 | 27/30 | 3 casos mal planteados, ningún bug |
| 6 | 2026-10-24 | 0.5.0 | Frontend TC061–TC077 + 5 re-ejecuciones | 21/22 | TC075 no se puede ejecutar en TestSprite; verificado a mano |
| 7 | 2026-10-24 | 0.5.0 | API TC001–TC030 | 30/30 | — |
| 8 | 2026-10-24 | 0.5.0 | API TC031–TC036 + re-ejecución de TC034 | 6/6 | TC034 tenía una expectativa errónea |

**Estado final (0.5.0):**

- Frontend: **77/77**, 76 por TestSprite y TC075 a mano.
- API: **36/36**.

Detalle por caso en `testsprite_tests/testsprite-mcp-test-report.md`.
Resultados crudos en `testsprite_tests/corridas/`. Las corridas 1–3 se
hicieron con el plan anterior, cuyos scripts están en
`corridas/scripts-anteriores/`.

Créditos: de 130 a 83,1 en las corridas 4–8. Fueron 119 ejecuciones de casos
y la generación del plan de API, unos 0,39 créditos por caso.

## 5. Hallazgos y correcciones

Cada fallo se clasificó como **bug real**, **expectativa de la prueba** (el
caso pedía algo que no es la regla del sistema), **datos** o **limitación de
la herramienta**. Solo los bugs reales cambian código, y cada uno trae su
prueba automática.

### Bugs reales

| Hallazgo | Causa | Arreglo | Prueba |
|---|---|---|---|
| La API dejaba de responder con peticiones simultáneas (corrida 1) | FastAPI valida la respuesta de las rutas síncronas en el threadpool **antes** de cerrar las dependencias con `yield`, aun con `scope="function"`. La sesión retenía la conexión mientras otros hilos esperaban el pool | `RutaConSesion` (`app/shared/database.py`) cierra la sesión en el mismo hilo al terminar cada ruta | `backend/tests/test_concurrencia.py` |
| `/login` y `/registro` daban 404 | Las rutas reales son `/auth/ingresar` y `/auth/crear-cuenta` | Redirecciones en `next.config.ts` | TC052, TC053 |
| Tras entrar, la página se quedaba cargando en el navegador remoto | `router.replace` + `router.refresh` no siempre completaba la navegación | `window.location.assign(destinoSeguro(next))`; `destinoSeguro` evita redirecciones abiertas (`//otro.com`) | `frontend/tests/sesion.test.ts` |
| El buscador mostraba un producto ya editado con el nombre viejo | La caché del router de Next reutiliza layouts y `loading.tsx` precargados hasta 5 minutos | El buscador recibe los productos de la página y el panel usa `prefetch={false}` | TC026 (corrida 2) |
| La lista de pedidos quedaba vieja tras un 400 (por ejemplo, cancelar un pedido que ya había cambiado) | Solo se recargaba al tener éxito | «Mis pedidos» y la cola recargan también al fallar | TC015 (corrida 2) |
| El admin general veía − / + y el campo de stock deshabilitados, sin explicación (corrida 4, TC021) | La tabla deshabilitaba los controles en lugar de quitarlos | Fila en solo lectura: número, «Agotado» si aplica y «solo lectura»; el pie deja de decir «los cambios se guardan» | TC021, TC037, TC049 |

### Expectativas corregidas en los planes

| Caso | Qué esperaba | Regla real |
|---|---|---|
| FE TC018 | Un producto nuevo «disponible para la venta» | Empieza activo, con 0 existencias («Agotado»), hasta que se le suma stock |
| FE TC035 | Precios «Referencia» en Almuerzo 01 | Almuerzo 01 es la única tienda con precios confirmados; Antojos muestra «Referencia» |
| FE TC045 | Ver el pedido entregado en la cola abierta | Los entregados salen de la cola; aparecen con «Ver entregados y cancelados» |
| API TC034 | `/metrics` en texto | Responde JSON por diseño (`contrato-api.md` §4.2) |

### Datos

- **Corrida 1:** el script de datos asignaba mal los números de pedido (un
  contador dentro de un subshell) y usaba el campo `existencias` en lugar de
  `cantidad`. Se reescribió `preparar_datos.sh`.
- **Corrida 1:** había pocos pedidos por pagar para casos paralelos. Ahora hay
  ocho por tienda.

## 6. Pruebas de la API

TestSprite generó 10 casos a partir de `testsprite_tests/code_summary_backend.yaml`,
que se generó desde `docs/api/openapi.json` con las reglas de permisos. Se
ampliaron a mano a 36, en `testsprite_backend_test_plan.json`:

- **Matriz de permisos completa** (`contrato-api.md` §5.1):
  - el admin general recibe 403 al ajustar o fijar stock, crear o editar
    productos, y avanzar o cancelar pedidos, y 200 en sus lecturas;
  - el admin de tienda escribe en la suya y recibe 403/404 en las demás;
  - el comprador recibe 403 en los endpoints de gestión;
  - un anónimo y un token inválido reciben 401.
- **Pedidos:**
  - `Idempotency-Key` obligatoria, y la misma llave devuelve los mismos
    pedidos;
  - un pedido por tienda;
  - sin stock o con cantidad inválida, 400/422;
  - transiciones de estado válidas e inválidas;
  - el comprador no cancela tras el pago;
  - cancelar repone el stock.
- **Inventario:** el stock nunca queda negativo y las cantidades inválidas dan
  422.
- **Validaciones:**
  - productos: precio negativo, nombre vacío o repetido (409);
  - registro: contraseña corta, correo inválido o duplicado (409);
  - login: con contraseña incorrecta, 401 sin revelar si el correo existe.
- **Otros:** `/identity/me` con roles por tienda, salud, métricas, detalle de
  producto y aislamiento entre compradores.

Para cambiar TestSprite a backend se editó `tmp/config.json`
(`type: backend`, `localEndpoint: http://localhost:8000`) y se reemplazó
temporalmente `tmp/code_summary.yaml`. Al terminar se restauró la
configuración de frontend.

## 7. Limitaciones conocidas

- **Datos compartidos entre casos paralelos.** Dos casos que tocan el mismo
  producto se pisan. Por eso hay ocho pedidos por pagar por tienda y se pide
  comparar cambios relativos.
- **El agente explora antes de grabar.** TestSprite primero explora la página y
  después reproduce el guion. Si en la exploración hizo un ajuste de stock, el
  guion final ve un número distinto del esperado: el caso TC019 de la tercera
  corrida dio 8 en vez de 7 con un solo clic grabado. No es un fallo de la
  aplicación; el log de la API muestra los dos `adjust`.
- **Horario.** Las tiendas muestran «Cerrado» fuera de su horario, pero la
  reserva sigue permitida (es informativo). Hay que decírselo al agente para
  que no lo marque como fallo.
- **Navegador remoto.** El navegador de TestSprite es más lento que uno local.
  Una navegación del cliente que dependa de `router.refresh()` puede no
  completarse, y por eso el login usa una navegación completa (sección 5).
