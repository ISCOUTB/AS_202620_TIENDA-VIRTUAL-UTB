# tflint — reglas aplicadas a la infraestructura de `infra/`.
#
# Se usa el set de reglas por defecto de Terraform más un plugin de AWS, que es
# donde aparecen los avisos que de verdad importan aquí: en un `plan` de
# creación casi no hay datos que analizar, pero los errores de tipado en los
# argumentos de los providers sí se detectan antes de tocar una plataforma real.

config {
  call_module_type = "local"
  force            = false
}

plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

# Avisos que en este repositorio son ruido Known: el proyecto se despliega
# deliberadamente sobre capas gratuitas y se prioriza auditar en la
# configuración qué cambia, no endurecer los planes de pago.
plugin "aws" {
  enabled = true
  version = "0.42.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

rule "terraform_deprecated_index" {
  enabled = true
}

rule "terraform_deprecated_interpolation" {
  enabled = true
}

rule "terraform_unused_declarations" {
  enabled = true
}

# `neon_project.tienda` y `render_web_service.api` declaran recursos cuyo
# borrado en cascada está contemplado, pero el orden importa: Terraform los
# destruye por dependencias, no por orden textual.
rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

# La convención de `main.tf` como punto de entrada es de módulos reutilizables.
# `infra/` es una configuración raíz: sus ficheros llevan prefijo de proveedor
# (`neon-project.tf`, `render-web-service.tf`, ...) para poder leerlos en orden
# temático, y esa es la única razón por la que la regla no aplica aquí.
rule "terraform_standard_module_structure" {
  enabled = false
}

# No se exige provider "required_version" por resource: la versión de Terraform
# ya está fijada en `required_version` en `infra/versions.tf`.
rule "terraform_required_version" {
  enabled = true
}

rule "terraform_unused_required_providers" {
  enabled = true
}
