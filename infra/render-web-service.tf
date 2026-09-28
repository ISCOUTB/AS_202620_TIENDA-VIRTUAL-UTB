# API: web service de Render con build Docker desde el repositorio.
#
# Sustituye a `render.yaml`. El provider oficial de Render no expone la
# posibilidad de declarar una variable sin valor ("sync: false" del blueprint),
# así que la separación entre secreto y no secreto la hace este archivo: aquí
# solo se inyecta `DATABASE_URL`, y su valor no está escrito en el repositorio
# sino que sale del módulo de Neon.

resource "render_web_service" "api" {
  name   = var.render_service_name
  plan   = var.render_plan
  region = var.render_region

  # Liveness. Render lo usa para monitorizar y para los despliegues sin
  # interrupción. El backend también expone `/health/ready`, que además consulta
  # la base de datos, pero no sirve como health check de despliegue porque
  # devuelve 503 si Neon está suspendido.
  health_check_path = "/health"

  runtime_source = {
    docker = {
      repo_url = var.github_repository_url
      branch   = var.github_default_branch

      # El contexto de build es la raíz del repositorio, no `backend/`: el
      # Dockerfile copia `backend/requirements.txt`, `backend/app` y
      # `docs/openapi/tienda-virtual.yaml`.
      context         = "."
      dockerfile_path = "./backend/Dockerfile"

      auto_deploy = true
    }
  }

  # `env_vars[].value` llega marcado como `sensitive` en el schema del provider,
  # así que el plan lo redacta y la contraseña no aparece en la salida. No hace
  # falta añadir `sensitive = true` aquí: ese atributo no existe para `env_vars`,
  # y un `value` plano lo escribiría en el estado y en cualquier `plan -out`
  # legible.
  env_vars = {
    DATABASE_URL = { value = local.database_url }
  }

  # `maintenance_mode` se omite a propósito: el provider falla al aplicarlo sobre
  # un servicio en plan gratuito. Al no declararlo se mantiene el valor por
  # defecto de la plataforma.
}
