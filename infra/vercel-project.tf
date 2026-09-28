# Cliente web: proyecto de Next.js en Vercel.
#
# Sustituye a la configuración implícita que se hacía importando el repositorio a
# mano en el dashboard. `frontend/vercel.json` se conserva: eso lo lee Vercel
# durante el build y sigue siendo parte de la configuración del cliente, no de la
# infraestructura.

resource "vercel_project" "web" {
  name = var.vercel_project_name

  framework = "nextjs"

  # El repositorio es un monorepo de facto: el cliente vive en `frontend/` y el
  # contexto de build tiene que ser ese subdirectorio.
  root_directory = "frontend"

  # No se declara `git_repository` a propósito. El plan Hobby de Vercel no
  # conecta proyectos con repositorios propiedad de una organización de GitHub, y
  # este repositorio está en la organización `ISCOUTB`. Declararlo aquí haría
  # fallar el apply. El despliegue a producción lo dispara el pipeline con
  # `vercel deploy --prod`; lo que gobierna Terraform es el proyecto y su
  # configuración, no el disparador del despliegue.
}
