# Variables de entorno del proyecto de Vercel.
#
# `API_URL` es la base de la API que el servidor de Next.js usa en
# `frontend/app/page.tsx`. No lleva prefijo `NEXT_PUBLIC_` porque la petición la
# hace el servidor, no el navegador, y por eso tampoco hace falta CORS.

resource "vercel_project_environment_variable" "api_url" {
  project_id = vercel_project.web.id
  key        = "API_URL"

  # Referencia al recurso de Render, no un literal. Es la cadena de
  # dependencias que sustituye al copy-paste entre dashboards: si la API cambia
  # de URL, esta variable se actualiza sola en el siguiente apply.
  value = local.api_url

  # `API_URL` es una URL pública, no un secreto. Marcarla como sensible la
  # haría ilegible desde la API de Vercel y desde el dashboard sin ganancia
  # ninguna: el valor no concede acceso a nada.
  sensitive = false

  # Solo producción. `development` y `preview` caen al valor por defecto del
  # código, `http://localhost:8000`, que es lo correcto para trabajar en local.
  target     = ["production"]
  visibility = "config"
}
