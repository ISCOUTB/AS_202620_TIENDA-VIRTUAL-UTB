# Valores derivados que usan varios módulos.

locals {
  # El backend lee DATABASE_URL al importar el módulo
  # (`backend/app/shared/database.py`), no puede recargarlo en caliente. Por eso
  # el valor se resuelve una sola vez, aquí, y los tres módulos lo consumen igual.
  # La URL sale del proyecto de Neon, no de ninguna variable: la contraseña la
  # genera el provider y nunca está escrita en el repositorio.
  database_url = neon_project.tienda.connection_uri_pooler

  # `render_web_service.url` no garantiza slash final; el keep-alive necesita
  # `${host}/health` y no `${host}//health`.
  api_url         = trimsuffix(render_web_service.api.url, "/")
  api_health_url  = "${local.api_url}/health"
  api_ready_url   = "${local.api_url}/health/ready"
  api_catalog_url = "${local.api_url}/catalog/products"
  api_metrics_url = "${local.api_url}/metrics"
  # Vercel compone el dominio por defecto de un proyecto perteneciente a un
  # equipo como `<proyecto>-<equipo>.vercel.app`. Con los valores actuales eso da
  # `tienda-virtual-utb-acme-8eed.vercel.app`, que es la URL ya publicada.
  vercel_default_url = "https://${var.vercel_project_name}-${var.vercel_team_slug}.vercel.app"
}
