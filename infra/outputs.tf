# Salidas agregadas de la infraestructura.
#
# Todo lo que las personas necesitan leer tras un `apply`. Ninguna contiene
# secretos salvo `database_url`, que va marcada como sensible y por eso no
# aparece en la salida por defecto de `terraform apply`.

output "api_url" {
  description = "URL pública de la API."
  value       = local.api_url
}

output "web_url" {
  description = <<-EOT
    URL pública del cliente web.

    Es una predicción construida a partir del nombre del proyecto y el slug del
    equipo, no un valor leído de Vercel: `vercel_project` solo expone `id` y
    `name`. La URL definitiva es la que asigne el primer despliegue a producción.

    Mientras el nombre del proyecto lleve el sufijo `-tf`, esta URL es la del
    stack nuevo y no coincide con la web ya en producción. Ese desajuste es
    intencionado y es lo que impide validar por error la infraestructura
    antigua.
  EOT
  value       = local.vercel_default_url
}

output "api_health_url" {
  description = "Endpoint de liveness de la API. Es el que consulta el keep-alive."
  value       = local.api_health_url
}

output "api_ready_url" {
  description = "Endpoint de readiness de la API. Verifica además la base de datos."
  value       = local.api_ready_url
}

output "api_metrics_url" {
  description = "Endpoint de métricas de la API."
  value       = local.api_metrics_url
}

output "api_catalog_url" {
  description = "Endpoint del catálogo. Es la comprobación de extremo a extremo: exercises SSR → API → PostgreSQL."
  value       = local.api_catalog_url
}

output "database_url" {
  description = "Cadena de conexión de PostgreSQL. Secreto: no se imprime sin `-show-sensitive`."
  value       = local.database_url
  sensitive   = true
}

output "database_project_id" {
  description = "ID del proyecto de Neon."
  value       = neon_project.tienda.id
}

output "database_branch_id" {
  description = "ID de la rama por defecto de Neon."
  value       = neon_project.tienda.default_branch_id
}

output "database_host_pooler" {
  description = "Host del endpoint con pooler. Útil para diagnóstico."
  value       = neon_project.tienda.database_host_pooler
}

output "database_app_role" {
  description = "Rol de PostgreSQL que usa la API."
  value       = neon_project.tienda.database_user
}

output "render_service_id" {
  description = "ID del web service de Render."
  value       = render_web_service.api.id
}

output "vercel_project_id" {
  description = "ID del proyecto de Vercel."
  value       = vercel_project.web.id
}
