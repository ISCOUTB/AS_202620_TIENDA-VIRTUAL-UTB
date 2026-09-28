# Versiones fijadas de Terraform y de los providers.
#
# Nota sobre Neon: no existe un provider oficial publicado en el registro. El
# repositorio `neondatabase/terraform-provider-neon` no publica releases, así que
# el provider que documenta Neon en neon.com/docs/reference/terraform es el
# comunitario `kislerdm/neon`. Se fija a `~> 0.18` para que un salto de versión
# mayor no ocurra por sorpresa en un `init -upgrade`.
terraform {
  required_version = "~> 1.16"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.18"
    }

    render = {
      source  = "render-oss/render"
      version = "~> 1.9"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.17"
    }

    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
  }

  # El estado vive en local y en git-ignorado (ver infra/README.md). Se declara
  # explícito para que quede constancia de la decisión y para que añadir un
  # backend remoto sea un cambio visible y deliberado en este bloque.
  backend "local" {}
}
