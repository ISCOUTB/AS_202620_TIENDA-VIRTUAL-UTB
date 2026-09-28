# Configuración de los cuatro providers.
#
# Ningún token se escribe aquí ni en ningún archivo versionado. Todos se leen
# del entorno:
#
#   NEON_API_KEY      -> provider "neon"   (Neon Console > API Keys)
#   RENDER_API_KEY    -> provider "render" (Render > Account Settings > API Keys)
#   GITHUB_TOKEN      -> provider "github" (PAT con permisos repo y workflow)
#   VERCEL_API_TOKEN  -> provider "vercel" (Vercel > Settings > Tokens)
#
# Exportarlos en la shell, o ponerlos en un gestor de secretos. Nunca en
# `*.auto.tfvars` si ese archivo va a compartirse por otros medios.
provider "neon" {}

provider "render" {
  owner_id = var.render_owner_id
}

provider "vercel" {
  # Slug del equipo de Vercel, no el ID. El provider acepta ambos y lo resuelve
  # para todos los recursos, de modo que ningún recurso necesita `team_id`.
  team = var.vercel_team_slug
}

provider "github" {}
