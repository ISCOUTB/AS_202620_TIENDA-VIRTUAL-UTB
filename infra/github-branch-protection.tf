# Protección de la rama `main`.
#
# Cierra el paso que `docs/despliegue-s8.md` marcaba como pendiente: convertir
# "el pipeline está en verde" en "el merge se bloquea si el pipeline falla".

resource "github_branch_protection" "main" {
  # `repository_id` admite el nombre o el node ID del repositorio.
  repository_id = var.github_repository
  pattern       = var.github_default_branch

  # Los checks exigidos vienen de `var.github_required_status_checks`, que hoy
  # solo contiene `backend`.
  #
  # Hay que ser cuidadoso aquí. Un check requerido que no se emite bloquea todos
  # los merges para siempre, sin explicar por qué, así que solo se exige lo que
  # la CI reporta de verdad:
  #
  # - `backend` es el nombre del job en tests.yml. La CI lo reporta siempre. Se
  #   exige.
  # - `SonarCloud Code Analysis` no es el nombre de ningún job, sino el que crea
  #   la app de SonarCloud. Además el job `sonarcloud` va condicionado a
  #   `if: env.SONAR_TOKEN != ''`, así que mientras no exista ese secreto se
  #   omite entero y el check nunca aparece. No se exige, por diseño.
  #
  # El comment anterior daba a entender que exigirlos era correcto "si algún día
  # se crea SONAR_TOKEN", pero el código sí los exigía, que es justo el estado
  # que bloquea los merges. La lista es ahora un dato declarativo: se amplía
  # añadiendo el nombre a la variable.
  required_status_checks {
    strict   = true
    contexts = var.github_required_status_checks
  }
}
