# Infraestructura como código

Todo lo que corre fuera del repositorio —la base de datos, la API y el cliente
web— está declarado aquí. Antes esa configuración estaba repartida entre
`render.yaml`, `neon.ts`, `frontend/vercel.json`, el dashboard de Render, el de
Vercel, el de Neon y el `.env` local de cada persona; los enlaces entre ellos
—la URL de la base de datos en la API, la URL de la API en el cliente— se
copiaban a mano y podían quedar desincronizados.

Aquí esas uniones son referencias entre recursos, no valores escritos.

## Lo que se gestiona y lo que no

| Recurso | Provider | Estado |
|---|---|---|
| Proyecto de PostgreSQL, rama, rol y base de datos en Neon | `kislerdm/neon` | Gestionado |
| Web service de la API en Render | `render-oss/render` | Gestionado |
| Proyecto y variable de entorno del cliente en Vercel | `vercel/vercel` | Gestionado |
| Variable `API_HEALTH_URL` del repositorio | `integrations/github` | Gestionado |
| Protección de la rama `main` | `integrations/github` | Gestionado |
| Programación del cron del keep-alive | — | **No gestionable** (ver abajo) |
| Bucket de Neon Object Storage `media` | — | **Eliminado**, no estaba en uso |
| Análisis de SonarCloud y su Quality Gate | — | Fuera de Terraform: no hay provider |
| `compose.yaml` (entorno local) | — | No es infraestructura de producción |

Tres cosas quedan fuera a propósito, y conviene tenerlas presentes:

- **El cron del keep-alive** sigue en `.github/workflows/keepalive.yml`. El
  provider de GitHub no tiene ningún recurso para la programación de workflows,
  así que no hay forma de moverlo. Lo que sí se gestiona es la URL que ese
  workflow consulta.
- **La conexión de Vercel con GitHub** no se declara. El plan Hobby de Vercel no
  conecta proyectos con repositorios de una organización de GitHub, y este
  repositorio está en la organización `ISCOUTB`. El despliegue a producción lo
  dispara el pipeline, no Terraform.
- **El objeto de almacenamiento de Neon** no tiene recurso en el provider, y el
  bucket que se había declarado (`media`) estaba vacío y sin código que lo
  usara. Se eliminó en lugar de mantener una dependencia fuera de Terraform por
  una función que nadie ejercía.

## Requisitos

Terraform 1.16 o superior. Los cuatro tokens se leen del entorno:

| Variable | Dónde se obtiene |
|---|---|
| `NEON_API_KEY` | Neon Console → Account → API Keys |
| `RENDER_API_KEY` | Render → Account Settings → API Keys |
| `GITHUB_TOKEN` | PAT de GitHub con permisos `repo` y `workflow` |
| `VERCEL_API_TOKEN` | Vercel → Settings → Tokens |

Ninguno va en un archivo. Comprobación rápida de que ningún secreto se ha
versionado por error:

```bash
git grep -niE "npg_|nak_live_|nsk_live_|BEGIN [A-Z]* PRIVATE KEY" -- infra/
```

## Uso

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # y rellenar render_owner_id
export NEON_API_KEY=... RENDER_API_KEY=... GITHUB_TOKEN=... VERCEL_API_TOKEN=...
export TF_VAR_render_owner_id=usr-...           # o dejarlo en terraform.tfvars

terraform init
terraform plan
terraform apply
```

`terraform.tfvars` está en `.gitignore`. El único valor obligatorio sin
valor por defecto es `render_owner_id`.

### Por qué el estado es local

El estado contiene la contraseña del rol de PostgreSQL de la API, en claro: es
la forma en que los providers de Terraform manejan las credenciales que
inventan ellos mismos, y no hay forma de evitarlo. Por eso `terraform.tfstate*`
está ignorado de forma explícita, y no por un patrón genérico, para que quede
constancia de la decisión.

La contrapartida es que no hay estado compartido ni bloqueo entre personas del
equipo: si dos members aplican a la vez pueden pisarse. Con una infraestructura
de cuatro recursos y cambios poco frecuentes es asumible. El día que empiece a
pesar más, el salto es un backend remoto, y la forma de hacerlo sin que el
estado deje de estar cifrado en el servidor del proveedor es un gestor de
secretos externo, lo que contradice el requisito de no depender de cuentas
adicionales. Ver ADR 0006.

### Verificación en CI

`.github/workflows/terraform.yml` ejecuta `fmt`, `validate` y `tflint` en cada
push y pull request que toque `infra/`. No ejecuta `plan`: sin estado remoto no
habría nada compartido que leer, y hacerlo exigiría publicar los cuatro tokens
como secretos del repositorio para obtener una vista que de todos modos se
revisaría a mano antes de aplicar.

## Orden de aplicación

Los recursos tienen dependencias reales, así que un `terraform apply` completo
sigue el orden solo. Si hace falta avanzar por partes, este es el orden seguro:

```bash
# 1. Base de datos. Si esto funciona, la cadena de conexión es válida.
terraform apply -target=neon_project.tienda

# 2. API contra esa base de datos.
terraform apply -target=render_web_service.api

# 3. Cliente web, apuntando a la URL que acaba de existir.
terraform apply -target=vercel_project.web -target=vercel_project_environment_variable.api_url

# 4. GitHub: variable del keep-alive y protección de rama.
terraform apply -target=github_actions_variable.api_health_url
terraform apply -target=github_branch_protection.main
```

Los `-target` están pensados para verificar por fases, no para el uso normal. Un
`apply` parcial deja el estado incompleto respecto a la configuración, y el
siguiente `plan` volverá a querer destruir lo que se saltó. Para uso normal,
`terraform apply` a secas.

## Comprobación tras aplicar

```bash
terraform output api_health_url   # GET  -> {"status":"ok"}
terraform output api_ready_url    # GET  -> 200; comprueba además la base de datos
terraform output api_metrics_url  # GET  -> contadores y latencias
terraform output api_catalog_url  # GET  -> los 4 productos; recorre SSR -> API -> PostgreSQL
```

Las dos últimas son las que importan: la primera serie demuestra que el proceso
está vivo, y la del catálogo que la cadena entera funciona.
