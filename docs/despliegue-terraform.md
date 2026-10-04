# Despliegue con Terraform — propuesta histórica

> **Sustituido sin aplicarse el 2026-10-04.** La configuración asociada fue
> retirada. Para el despliegue vigente use
> [`despliegue-dokploy.md`](despliegue-dokploy.md).

> **Estado: pendiente de aplicar.** La configuración está versionada en
> [`infra/`](../infra) y validada (`fmt`, `validate`, `tflint` en verde), pero
> **aún no se ha ejecutado ningún `terraform apply`**: falta crear los cuatro
> tokens de API. Hasta que eso ocurra, la infraestructura en producción sigue
> siendo la que se desplegó el 2026-09-27 y se documentó en
> [`despliegue-s8.md`](despliegue-s8.md).
>
> **Trazabilidad:** ADR [0006](adr/0006-infra-como-codigo-terraform.md).
> Coste y límites de las capas gratuitas: [`costos-despliegue.md`](costos-despliegue.md).

## Por qué se recrea en vez de importar

La opción normal ante infraestructura que ya funciona es importarla
(`terraform import`), que no cambia nada de lo que hay. Aquí se decide
reconstruirla desde cero, y conviene que el motivo quede escrito porque no es
obvio: **el objetivo del entregable no era solo tener la infraestructura
declarada, sino demostrar que se puede reconstruir desde el repositorio**. Un
estado importado a mano demuestra lo contrario: que alguien tuvieron que
escribir a mano el estado que la plataforma ya tenía.

El plan original reconocía este riesgo y la mitigación: la URL de entrega ya
estaba publicada y verificada, así que **no se destruye nada hasta que el stack
nuevo esté funcionando**. Es un despliegue en paralelo, no un reemplazo en
caliente.

Lo que hace que perder los datos no sea un problema es que el backend se
autorreconstruye: `backend/app/main.py:47-50` crea el esquema y siembra el
catálogo en el arranque de forma idempotente, así que un proyecto de Neon nuevo
queda poblado en su primer despliegue sin intervención. El diseño ya era
reconstruible; la migración solo lo hace explícito.

## Orden de ejecución

Cada paso verifica antes de dar por bueno el siguiente. Los pasos 1 y 2 se
pueden hacer sin tocar nada de lo que está en producción.

### 0. Preparación

```bash
# Terraform 1.16 o superior
cd infra
cp terraform.tfvars.example terraform.tfvars   # rellenar render_owner_id
```

Los cuatro tokens, todos desde el entorno y ninguno en un archivo:

| Token | Dónde se obtiene | Permisos |
|---|---|---|
| `NEON_API_KEY` | Neon Console → Account → API Keys | — |
| `RENDER_API_KEY` | Render → Account Settings → API Keys | — |
| `GITHUB_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens | `repo`, `workflow` |
| `VERCEL_API_TOKEN` | Vercel → Settings → Tokens | — |

```bash
export NEON_API_KEY=... RENDER_API_KEY=... GITHUB_TOKEN=... VERCEL_API_TOKEN=...
export TF_VAR_render_owner_id=usr-...     # o dejarlo en terraform.tfvars
terraform init
terraform plan      # debe salir con 4 recursos a crear
```

Antes de nada, comprobar la región del servicio que ya existe, porque
`render_region` no tiene valor por defecto correcto garantizado y el recurso la
exige:

```bash
curl -fsS -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/srv-dasmvs0473hc73921aj0 \
  | python3 -c 'import sys,json; s=json.load(sys.stdin)["service"]; print(s["region"], s["plan"])'
```

Si la región no es `oregon`, ponerla en `terraform.tfvars`. La API acepta `free`
como plan; el provider no lo valida contra una lista.

### 1. Base de datos (Neon)

```bash
terraform apply -target=neon_project.tienda
```

Crea el proyecto, la rama `production`, el rol `tienda_app` y la base `neondb`.
Los dos `check` del plan deben pasar: uno verifica que la URI apunta al endpoint
**con pooler** y el otro que fija `sslmode=require` y `channel_binding=require`.
Si alguno falla, para aquí: el backend depende de ambos
(`backend/app/shared/database.py:23-25`).

Comprobar la conexión antes de seguir:

```bash
cd backend
python - <<'PY'
import os, urllib.request
os.environ["DATABASE_URL"] = "<valor de terraform output -show-sensitive=1 -raw database_url>"
from app.main import app
from fastapi.testclient import TestClient
with TestClient(app) as c:
    print(c.get("/health/ready").json())
PY
```

Debe devolver `{"status":"ok","detalle":null}`. Un 503 con
`"base de datos no disponible"` significa que la URL no conecta.

### 2. API (Render)

```bash
terraform apply -target=render_web_service.api
```

Render compila la imagen desde el repositorio y despliega. Tarda varios minutos
la primera vez. `DATABASE_URL` se inyecta desde el proyecto del paso 1, no desde
ningún archivo.

```bash
terraform output api_health_url   # -> {"status":"ok"}
terraform output api_ready_url    # -> 200
terraform output api_catalog_url  # -> los 4 productos del catálogo
```

**En este punto ya hay una API funcionando contra una base de datos nueva, en
paralelo con la que está en producción.** Nada de lo anterior se ha tocado.

### 3. Cliente web (Vercel)

```bash
terraform apply -target=vercel_project.web -target=vercel_project_environment_variable.api_url
terraform output web_url
```

El proyecto se crea con `framework = "nextjs"` y `root_directory = "frontend"`.
`API_URL` queda apuntando a la API del paso 2.

Los nombres de este paso llevan sufijo `-tf` (`tienda-virtual-utb-tf`) mientras
coexisten con el stack en producción. Por eso `web_url` devuelve la URL del
proyecto **nuevo** y no la de la web actual, que es justo lo que permite
distinguir una validación correcta de un falso positivo.

El despliegue a producción **no** lo dispara Terraform. El plan Hobby de Vercel
no conecta proyectos con repositorios de una organización de GitHub —este
repositorio está en la organización `ISCOUTB`—, así que no hay despliegue
automático al hacer push. Se hace en local, y **el enlace al proyecto hay que
hacerlo explícitamente**: la CLI guarda en `frontend/.vercel/project.json` a qué
proyecto apunta, y esa carpeta está en `.gitignore` para que nadie la versione
por error.

```bash
cd frontend
npx vercel link --yes --project tienda-virtual-utb-tf --token "$VERCEL_API_TOKEN" --scope acme-8eed
npx vercel deploy --prod --token "$VERCEL_API_TOKEN" --scope acme-8eed
```

Sin el `vercel link` explícito, la CLI pediría el proyecto de forma
interactiva y es fácil acabar desplegando sobre el proyecto antiguo.

**Quitar la protección SSO del proyecto nuevo.** Este es el paso que la API de
Vercel no deja automatizar desde Terraform: ninguno de los cuatro providers
usados tiene un atributo `sso*`, así que un proyecto creado por Terraform hereda
la protección de la cuenta y su URL responde 401. Hay que hacerlo a mano, una
sola vez por proyecto:

```bash
# El ID del proyecto sale del output
terraform output vercel_project_id
curl -fsS -X PATCH "https://api.vercel.com/v9/projects/<ID_DEL_PROYECTO>" \
  -H "Authorization: Bearer $VERCEL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection": null}'
```

Comprobar que la URL es pública y que renderiza de verdad:

```bash
terraform output web_url
curl -fsS "$(terraform output -raw web_url)" | grep -c '<h1'   # SSR real
```

Un `0` en el `grep` significa que llegó una página vacía o una redirección: eso
es el síntoma de la protección SSO sin desactivar. Si sale un aviso de
autenticación, repite el `PATCH` anterior.

### 4. GitHub

```bash
terraform apply -target=github_actions_variable.api_health_url
terraform apply -target=github_branch_protection.main
```

La variable `API_HEALTH_URL` pasa a existir en el repositorio y
`.github/workflows/keepalive.yml` deja de usar el valor de reserva que tenía
mientras tanto.

La protección de `main` exige **solo el check `backend`**, que es el nombre del
job en `tests.yml` y por tanto un check que la CI reporta siempre. No exige
`SonarCloud Code Analysis`: ese nombre lo crea la app de SonarCloud, no el
workflow, y el job `sonarcloud` va condicionado a `if: env.SONAR_TOKEN != ''`,
de modo que mientras no exista ese secreto no se emite. Exigirlo bloquearía
todos los merges de forma indefinida. La lista de checks está en la variable
`github_required_status_checks`, así que ampliarlo cuando SonarCloud esté
montado es añadir el nombre y volver a aplicar.

> **El check `sonarcloud` no se exige, y es deliberado.** Ese job del workflow
> está condicionado a `if: env.SONAR_TOKEN != ''`: mientras el equipo no cree el
> secreto no se ejecuta y nunca reporta estado, y un check requerido que no
> reporta bloquea todos los merges sin señal visible. Si algún día se crea
> `SONAR_TOKEN` y se desactiva el análisis automático de SonarCloud, entonces sí
> tiene sentido exigirlo también.

### 5. Corte

Solo cuando los pasos 1 a 4 estén verificados y la URL nueva sirva el catálogo
completo.

**Cortar en este orden**, que es el que no deja nada a medias:

1. Actualizar el keep-alive a la URL nueva —ya lo hace el paso 4, porque
   `github_actions_variable` toma la URL del servicio nuevo—.
2. Desviar la entrega: actualizar el `README.md` y la cabecera de este documento
   con la URL nueva.
3. Destruir la infraestructura anterior, que ya no recibe tráfico:
   `neon_project` `wandering-star-51602409`, el `render_web_service`
   `srv-dasmvs0473hc73921aj0` y el proyecto de Vercel `tienda-virtual-utb`
   anterior. **Con el manual de la API de cada plataforma**, no desde Terraform:
   no están en el estado y este repositorio no debe governarlos.
4. Revocar las credenciales de Neon Object Storage (`nak_live_` / `nsk_live_`).
   Apuntaban a la rama `production` del proyecto antiguo y a un bucket vacío, y
   ningún código las usaba. Con la rama destruida ya no sirven de nada, pero
   revocarlas de forma explícita es lo correcto.
5. Borrar del repositorio los ficheros de IaC sustituidos: `render.yaml`,
   `neon.ts`, y el `package.json` y `package-lock.json` raíz, que solo existen
   para dar soporte a `@neon/config`. Retirar también `.neon` del `.gitignore`.
6. Eliminar `/home/pxtron/Downloads/env`. Contiene la contraseña de
   `neondb_owner` y unas claves de almacenamiento que ya están en un archivo de
   texto plano fuera del repositorio. Con el proyecto destruido el primer valor
   queda invalidado; el archivo no tiene razón para seguir existiendo.

> **Aviso sobre la ventana de coexistencia.** Render concede 750 horas de
> instancia gratuitas por espacio de trabajo y mes. Dos servicios en marcha
> consumiendo 24 h (~1440 h) superarían ese límite, y al agotarlo Render
> suspende **todos** los servicios gratuitos hasta el mes siguiente. La
> coexistencia tiene que durar horas, no días, y conviene apagar el servicio
> antiguo en cuanto el nuevo responda.

## Verificación final

| Comprobación | Cómo |
|---|---|
| Aplicación pública | `terraform output web_url` desde fuera de la red UTB, con el catálogo de 4 productos |
| API viva | `terraform output api_health_url` → `{"status":"ok"}` |
| API contra la base de datos | `terraform output api_ready_url` → 200 |
| Cadena completa | `terraform output api_catalog_url` → 4 productos |
| Keep-alive | Lanzar el workflow a mano desde la pestaña Actions |
| Protección de rama | Un PR con el pipeline en rojo no debe poder mergearse |
| IaC versionada | `infra/` con `fmt`, `validate` y `tflint` en verde en el workflow `Terraform` |
| Sin secretos | `git grep -niE "npg_\|nak_live_\|nsk_live_" -- infra/` no devuelve nada |
| Coste | [`costos-despliegue.md`](costos-despliegue.md): $0/mes, con los límites de las capas gratuitos corregidos |

## Reversión

Hasta el paso 5, revertir es no hacer nada: la infraestructura anterior sigue
intacta y en servicio. A partir de ahí, la reversión es un despliegue manual
desde los paneles, y con la base de datos perdida solo es posible si se acepta
volver a sembrar el catálogo —lo cual el backend hace solo en el arranque.
