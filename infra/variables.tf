# Entradas de la infraestructura. Ninguna es secreta: son nombres, slugs e IDs
# públicos. Los secretos van por variable de entorno (ver providers.tf).

# --- Neon -----------------------------------------------------------------

variable "neon_project_name" {
  description = <<-EOT
    Nombre del proyecto de PostgreSQL en Neon.

    Lleva el sufijo `-tf` a propósito: mientras el stack recreado por Terraform
    convive con el stack ya en producción (que se llama `tienda-utb`), los
    nombres deben ser distinguibles para no operar sobre el recurso equivocado.
    En el corte definitivo se renombra a `tienda-utb` y se vuelve a aplicar.
  EOT
  type        = string
  default     = "tienda-utb-tf"
}

variable "neon_region_id" {
  description = "Región de despliegue en Neon. Debe coincidir con la del proyecto actual (us-east-2)."
  type        = string
  default     = "aws-us-east-2"
}

variable "neon_pg_version" {
  description = "Versión major de PostgreSQL. La actual es 18.6."
  type        = number
  default     = 18
}

variable "neon_branch_name" {
  description = "Rama por defecto del proyecto. Es la que sirve producción."
  type        = string
  default     = "production"
}

variable "neon_app_role_name" {
  description = <<-EOT
    Rol de PostgreSQL que usa la API. Antes se usaba `neondb_owner`, el rol
    propietario del proyecto y por tanto con permisos de administración sobre
    toda la base. Este rol existe solo para la aplicación y su contraseña la
    genera Terraform.
  EOT
  type        = string
  default     = "tienda_app"
}

variable "neon_database_name" {
  description = "Base de datos de la aplicación. El backend crea el esquema y siembra el catálogo en el arranque."
  type        = string
  default     = "neondb"
}

variable "neon_autoscaling_min_cu" {
  description = "Mínimo de unidades de cómputo. 0.25 CU es el mínimo del plan gratuito."
  type        = number
  default     = 0.25
}

variable "neon_autoscaling_max_cu" {
  description = "Máximo de unidades de cómputo. El plan gratuito escala hasta 2 CU."
  type        = number
  default     = 2
}

variable "neon_suspend_timeout_seconds" {
  description = <<-EOT
    Segundos de inactividad antes de suspender el cómputo. 300 coincide con el
    "scale to zero after 5 minutes" del plan gratuito, que no se puede desactivar.
  EOT
  type        = number
  default     = 300
}

# --- Render ---------------------------------------------------------------

variable "render_service_name" {
  description = <<-EOT
    Nombre del web service que aloja la API.

    Lleva el sufijo `-tf` a propósito: convive con el servicio ya en producción
    (`tienda-utb-api`) durante la validación en paralelo, y dos servicios con el
    mismo nombre serían indistinguibles al leer un log o una factura. En el corte
    definitivo pasa a `tienda-utb-api`.
  EOT
  type        = string
  default     = "tienda-utb-api-tf"
}

variable "render_plan" {
  description = <<-EOT
    Plan de cómputo de Render. `free` es el actual. La documentación del provider
    solo enumera planes de pago, pero el atributo no valida contra esa lista (es
    una cadena libre que se envía a la API, y la API sí acepta `free`), así que
    `free` funciona. Se deja parametrizado para poder subir a `starter` sin
    editar la configuración.
  EOT
  type        = string
  default     = "free"
}

variable "render_region" {
  description = <<-EOT
    Región de Render. `ohio` es la del servicio de producción
    `srv-dasmvs0473hc73921aj0`, confirmado contra la API de Render. No es
    `oregon`: se dejó ese valor por defecto sin verificar y habría creado la
    API nueva en un continente distinto del actual, con la latencia y el
    cumplimiento de datos que eso implica. Si en algún momento se cambia de
    región, hay que declararlo también en el `.tfvars`.
  EOT
  type        = string
  default     = "ohio"
}

variable "render_owner_id" {
  description = <<-EOT
    ID del propietario en Render, con prefijo `usr-` para una cuenta personal o
    `tea-` para un equipo. Aparece en la URL al abrir Ajustes de usuario o de
    equipo en el dashboard. No es un secreto, pero tampoco es adivinable.
  EOT
  type        = string
}

# --- Vercel ---------------------------------------------------------------

variable "vercel_project_name" {
  description = <<-EOT
    Nombre del proyecto de Vercel. Determina el subdominio de entrega.

    Lleva el sufijo `-tf` a propósito: con el nombre del proyecto en producción
    el output `web_url` devolvería la URL de la web ya desplegada, y eso haría
    pensar que la verificación posterior pasó cuando en realidad se estaría
    mirando la infraestructura antigua. Con el sufijo, la URL esperada
    `https://tienda-virtual-utb-tf-<equipo>.vercel.app` es inequívocamente la
    nueva. En el corte definitivo pasa a `tienda-virtual-utb`.
  EOT
  type        = string
  default     = "tienda-virtual-utb-tf"
}

variable "vercel_team_slug" {
  description = "Slug del equipo de Vercel propietario del proyecto."
  type        = string
  default     = "acme-8eed"
}

# --- GitHub ---------------------------------------------------------------

variable "github_repository" {
  description = "Nombre del repositorio, sin organización."
  type        = string
  default     = "AS_202620_TIENDA-VIRTUAL-UTB"
}

variable "github_repository_url" {
  description = "URL HTTPS clonable del repositorio. La usan Render y el build de Vercel."
  type        = string
  default     = "https://github.com/ISCOUTB/AS_202620_TIENDA-VIRTUAL-UTB"
}

variable "github_default_branch" {
  description = "Rama desde la que se despliega automáticamente."
  type        = string
  default     = "main"
}

variable "github_required_status_checks" {
  description = <<-EOT
    Checks de GitHub Actions que deben pasar para poder mergear en la rama
    principal. Se parametriza porque el nombre del check depende de quién lo
    emite, y exigir uno que nadie emite bloquea los merges de forma indefinida
    sin señal visible del motivo.

    De momento solo se exige `backend`, que es el nombre del job del workflow
    `tests.yml` y por tanto un check que la CI reporta siempre.

    `SonarCloud Code Analysis` NO se incluye, y no por descuido: no es el nombre
    de ningún job (el job se llama `sonarcloud`), sino el que crea la app de
    SonarCloud, y además el job va condicionado a `if: env.SONAR_TOKEN != ''`.
    Mientras el equipo no cree ese secreto, el job se omite entero y ese check
    no llega a existir.

    Cuando se cree `SONAR_TOKEN`, se desactive el análisis automático de
    SonarCloud y se confirme que el check aparece en la pestaña de PR, basta con
    añadir el nombre a esta lista y volver a aplicar. No hace falta reescribir
    el recurso.
  EOT
  type        = list(string)
  default     = ["backend"]
}
