# Configuración de GitHub Actions gestionada desde Terraform.
#
# Solo se declara aquí lo que el provider de GitHub sabe expresar. El cron del
# keep-alive NO se puede mover a Terraform: no existe un recurso
# `github_actions_schedule` en `integrations/github`, así que la programación
# sigue en el bloque `schedule:` de `.github/workflows/keepalive.yml`, que está
# versionado en el repositorio. Lo que sí se centraliza aquí es la URL, que
# hasta ahora estaba escrita a mano en ese workflow.

# URL del health check de la API, expuesta al workflow como variable del
# repositorio. Así el keep-alive sigue a la API si Render le cambia el dominio.
resource "github_actions_variable" "api_health_url" {
  repository    = var.github_repository
  variable_name = "API_HEALTH_URL"
  value         = local.api_health_url
}
