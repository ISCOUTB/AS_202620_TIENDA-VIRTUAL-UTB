#!/bin/sh
# Crea (o actualiza) el rol de login con el que se conecta la API (ADR 0014).
#
# - PostgreSQL lo ejecuta solo al inicializar un volumen vacío
#   (/docker-entrypoint-initdb.d). Para una base existente se lanza a mano:
#     docker compose exec database sh /docker-entrypoint-initdb.d/10-rol-aplicacion.sh
# - Es idempotente: si el rol existe, solo reafirma sus atributos y contraseña.
# - El rol NO es dueño, ni superusuario, ni BYPASSRLS. Los GRANT sobre tablas
#   los aplica la migración 0002_politicas_rls, no este script.
#
# Variables: POSTGRES_USER, POSTGRES_DB (las del contenedor), APP_DB_USER
# (por defecto tienda_app) y APP_DB_PASSWORD (obligatoria). La contraseña viaja
# como variable de psql y se cita con %L: no se interpola en el SQL.
#
# No usa `exit`: el entrypoint de la imagen puede cargarlo con `source`.

: "${APP_DB_PASSWORD:?Define APP_DB_PASSWORD para el rol de la aplicación}"

psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -v app_user="${APP_DB_USER:-tienda_app}" \
    -v app_password="$APP_DB_PASSWORD" <<'EOSQL'
SELECT format('CREATE ROLE %I LOGIN', :'app_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') \gexec

SELECT format(
    'ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L',
    :'app_user', :'app_password'
) \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_user') \gexec
EOSQL
