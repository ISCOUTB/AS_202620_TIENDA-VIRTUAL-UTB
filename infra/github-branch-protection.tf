# Protección de la rama `main`.
#
# Cierra el paso que `docs/despliegue-s8.md` marcaba como pendiente: convertir
# "el pipeline está en verde" en "el merge se bloquea si el pipeline falla".

resource "github_branch_protection" "main" {
  # `repository_id` admite el nombre o el node ID del repositorio.
  repository_id = var.github_repository
  pattern       = var.github_default_branch

  # Los checks exigidos son `backend` y `SonarCloud Code Analysis`.
  #
  # El check `sonarcloud` del workflow NO se exige, y es deliberado: ese job
  # está condicionado a `if: env.SONAR_TOKEN != ''`, de modo que mientras el
  # equipo no cree ese secreto el job no se ejecuta y nunca reporta estado. Un
  # check requerido que no reporta bloquea todos los merges de forma indefinida,
  # sin señal visible de por qué. Si algún día se crea `SONAR_TOKEN` y se
  # desactiva el análisis automático de SonarCloud, entonces sí tiene sentido
  # exigirlos.
  required_status_checks {
    strict = true

    contexts = [
      "backend",
      "SonarCloud Code Analysis",
    ]
  }
}
