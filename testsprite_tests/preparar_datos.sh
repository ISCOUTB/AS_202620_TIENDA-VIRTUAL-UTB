#!/usr/bin/env bash
# Deja la base E2E lista para TestSprite y se puede repetir antes de cada corrida.
#
# - Recrea la base, migra y siembra:
#   - el admin general `admin@utb.edu.co`, que solo supervisa (ADR 0017);
#   - un admin por tienda, `admin.<tienda>@utb.edu.co`, con la contraseña de
#     `SEED_TIENDAS_PASSWORD`.
# - Registra a `ana` (comprador).
# - Crea pedidos de ana en Almuerzo 01 y en Antojos, en todos los estados: por
#   tienda, ocho por pagar (las pruebas corren en paralelo y varias cancelan o
#   avanzan uno), uno pagado, uno en preparación, uno entregado y uno
#   cancelado. Los estados los avanza el admin de cada tienda.
#
# Solo datos de demostración. La API debe estar corriendo contra esta base
# (rol `tienda_app`); las conexiones viejas se cortan al recrearla y el pool
# las renueva solo (`pool_pre_ping`).
#
# Variables (con sus valores por defecto):
#   PG_CONTENEDOR=tvutb-test-pg  PG_USUARIO=tienda  BD=tienda_e2e
#   OWNER_URL=postgresql+psycopg2://tienda:tienda@localhost:55432/$BD
#   PYTHON=python (con las dependencias de backend/)  API=http://localhost:8000
#   CLAVE_TIENDAS=Tienda-2026 (contraseña de los admins de tienda E2E)
set -euo pipefail

PG_CONTENEDOR=${PG_CONTENEDOR:-tvutb-test-pg}
PG_USUARIO=${PG_USUARIO:-tienda}
BD=${BD:-tienda_e2e}
OWNER_URL=${OWNER_URL:-postgresql+psycopg2://tienda:tienda@localhost:55432/$BD}
PYTHON=${PYTHON:-python}
API=${API:-http://localhost:8000}
CLAVE_TIENDAS=${CLAVE_TIENDAS:-Tienda-2026}
RAIZ=$(cd "$(dirname "$0")/.." && pwd)

export JWT_SECRET=${JWT_SECRET:-clave-de-pruebas-que-no-se-usa-en-produccion}

psql_bd() { docker exec -i "$PG_CONTENEDOR" psql -U "$PG_USUARIO" -v ON_ERROR_STOP=1 -q "$@"; }

echo "→ Recreando $BD"
psql_bd -d postgres -c "DROP DATABASE IF EXISTS $BD WITH (FORCE)" -c "CREATE DATABASE $BD"

echo "→ Migrando y sembrando"
(
  cd "$RAIZ/backend"
  MIGRATIONS_DATABASE_URL=$OWNER_URL DATABASE_URL=$OWNER_URL "$PYTHON" -m alembic upgrade head >/dev/null 2>&1
  DATABASE_URL=$OWNER_URL SEED_ADMIN_CORREO=admin@utb.edu.co SEED_ADMIN_PASSWORD=Admin-Demo-2026 \
    SEED_ADMIN_NOMBRE="Administración" SEED_TIENDAS_PASSWORD=$CLAVE_TIENDAS \
    "$PYTHON" -m app.seed >/dev/null
)

json() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }

token() {
  curl -sf -X POST "$API/identity/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | json "d['access_token']"
}

echo "→ Cuentas de prueba"
curl -sf -X POST "$API/identity/register" -H 'Content-Type: application/json' \
  -d '{"nombre":"Ana Compradora","email":"ana@utb.edu.co","password":"Comprador-2026"}' >/dev/null
ANA=$(token ana@utb.edu.co Comprador-2026)

# Productos de una tienda con existencias de sobra.
productos_de() {
  python3 - "$API" "$1" <<'EOF'
import json, sys, urllib.request
api, tienda = sys.argv[1:]
productos = json.load(urllib.request.urlopen(f"{api}/catalog/products"))
stock = {s["product_id"]: s["existencias"] for s in json.load(urllib.request.urlopen(f"{api}/inventory"))}
print(*[p["id"] for p in productos if p["tienda"] == tienda and stock.get(p["id"], 0) >= 5])
EOF
}

pedido() {
  curl -sf -X POST "$API/orders" -H "Authorization: Bearer $ANA" -H 'Content-Type: application/json' \
    -H "Idempotency-Key: $(python3 -c 'import uuid; print(uuid.uuid4())')" \
    -d "{\"items\":[{\"product_id\":$1,\"cantidad\":1}],\"hora_recogida\":\"$2\"}" | json "d[0]['id']"
}

# Siembra los pedidos de una tienda; su admin avanza los estados.
pedidos_de() {
  local tienda=$1 admin productos
  admin=$(token "admin.$tienda@utb.edu.co" "$CLAVE_TIENDAS")
  read -r -a productos < <(productos_de "$tienda")
  # Pedido número $1: rota productos y horas (11:00, 11:10…).
  pedido_n() {
    pedido "${productos[$(($1 % ${#productos[@]}))]}" "$(printf "%02d:%02d" $((11 + $1 / 6)) $(($1 % 6 * 10)))"
  }
  estado() {
    curl -sf -X POST "$API/orders/$1/estado" -H "Authorization: Bearer $admin" \
      -H 'Content-Type: application/json' -d "{\"estado\":\"$2\"}" >/dev/null
  }

  local entregado en_preparacion pagado cancelado por_pagar=()
  entregado=$(pedido_n 0)
  for e in pagado en_preparacion listo entregado; do estado "$entregado" "$e"; done
  en_preparacion=$(pedido_n 1)
  for e in pagado en_preparacion; do estado "$en_preparacion" "$e"; done
  pagado=$(pedido_n 2)
  estado "$pagado" pagado
  cancelado=$(pedido_n 3)
  curl -sf -X POST "$API/orders/$cancelado/cancel" -H "Authorization: Bearer $ANA" \
    -H 'Content-Type: application/json' -d '{}' >/dev/null
  for i in $(seq 4 11); do por_pagar+=("#$(pedido_n "$i")"); done

  echo "  $tienda: entregado #$entregado, en preparación #$en_preparacion, pagado #$pagado," \
    "cancelado #$cancelado, por pagar ${por_pagar[*]}"
}

echo "→ Pedidos de ana"
pedidos_de almuerzo-01
pedidos_de antojos
echo "Listo. Admins de tienda: admin.<tienda>@utb.edu.co (antojos, punto-fit, alegria, almuerzo-01, almuerzo-02)."
