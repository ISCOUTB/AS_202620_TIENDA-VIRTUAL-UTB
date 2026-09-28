# Base de datos: proyecto de Neon con la rama, el rol y la base de la aplicación.
#
# El bloque `branch` declara de una vez los tres objetos que antes se creaban a
# mano o por consola, y que además los crea el propio proyecto al aprovisionarse:
# la rama por defecto, su rol y su base de datos. Modelarlos como recursos
# separados (`neon_branch`, `neon_role`, `neon_database`) chocaría con este
# bloque, porque la rama por defecto solo puede existir una vez y solo admite un
# endpoint `read_write`.

resource "neon_project" "tienda" {
  name       = var.neon_project_name
  region_id  = var.neon_region_id
  pg_version = var.neon_pg_version

  branch {
    name = var.neon_branch_name

    # Rol y base de datos dedicados a la aplicación. Antes Render recibía el
    # `DATABASE_URL` de `neondb_owner`, el rol con privilegios plenos que Neon
    # crea por defecto.
    #
    # Renombrarlo da identidad, no autorización: según la documentación de Neon,
    # el rol por defecto de un proyecto recibe la pertenencia a
    # `neon_superuser` aunque se le ponga otro nombre, así que `tienda_app`
    # sigue pudiendo crear roles y bases dentro de su rama. Lo que se consigue
    # es que la contraseña la genere el provider y no esté escrita en ningún
    # archivo, y que exista un rol con nombre de aplicación en vez de una
    # credencial de administración genérica en producción. Para mínimo
    # privilegio real haría falta un `neon_role` con concessions SQL explícitas
    # y sin `neon_superuser`, que el provider no expresa.
    role_name     = var.neon_app_role_name
    database_name = var.neon_database_name
  }

  # El proyecto no declara `suspend_timeout_seconds` en su propio bloque
  # principal para la rama por defecto: se fija aquí porque es el cómputo
  # principal del proyecto.
  autoscaling_limit_min_cu = var.neon_autoscaling_min_cu
  autoscaling_limit_max_cu = var.neon_autoscaling_max_cu
  suspend_timeout_seconds  = var.neon_suspend_timeout_seconds
}

# `connection_uri_pooler` es la URI del endpoint *con pooler*, que es la que
# espera el backend: el pool de SQLAlchemy usa `pool_pre_ping` y
# `pool_recycle = 280` (`backend/app/shared/database.py`) porque el pooler de
# Neon cierra las conexiones ociosas. Si por lo que sea devolviera la URI sin
# pooler, esos dos ajustes pasarían a ser contraproducentes y el fallo sería
# silencioso, así que se comprueba en el plan en vez de confiar en el sufijo.
check "database_url_uses_pooler" {
  assert {
    condition     = strcontains(local.database_url, "-pooler.")
    error_message = "La URI de Neon no apunta a un endpoint con pooler. El backend requiere el pooler (pool_pre_ping y pool_recycle asumen que existe)."
  }
}

# La URL que espera el driver `psycopg2-binary` fijado en
# `backend/requirements.txt`. Si desaparece `sslmode=require` o
# `channel_binding=require`, Neon la seguiría aceptando pero el transporte
# dejaría de estar protegido, así que también se verifica.
check "database_url_requires_tls" {
  assert {
    condition     = strcontains(local.database_url, "sslmode=require") && strcontains(local.database_url, "channel_binding=require")
    error_message = "La URI de Neon no fija sslmode=require y channel_binding=require. Verifica que la plantilla de Neon no haya cambiado."
  }
}
