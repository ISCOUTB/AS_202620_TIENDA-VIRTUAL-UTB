"""Siembra explícita de datos de demostración: `python -m app.seed`.

Composition root: solo usa las operaciones públicas de cada módulo. Es
idempotente (alta o actualización por clave natural) y no crea usuarios ni
contraseñas. Se ejecuta con las credenciales del rol dueño
(`MIGRATIONS_DATABASE_URL` o `DB_MIGRATIONS_*`), no con el rol de la API, que
está sujeto a RLS (ADR 0014).

Opcionalmente carga el JSON que produce `scripts/exportar_datos_legado.py`:

    python -m app.seed --desde-json datos_legado/legado_20261022T120000Z.json
"""

import argparse
import json
from pathlib import Path

from sqlalchemy.orm import Session, sessionmaker

from app.modules.catalog.public import asegurar_categoria, asegurar_producto, asegurar_tienda
from app.modules.inventory.public import asegurar_existencia_inicial
from app.shared.database import crear_engine, resolve_database_url

# Tiendas de docs/api/tiendas-catalogo.md (textos de frontend/lib/tiendas.ts).
TIENDAS = (
    (
        "antojos",
        "Antojos",
        "La tienda de barrio que vive dentro de la cafetería. Mecatos, fritos, galletas, "
        "chicles y gaseosas: lo mismo que comprarías en la esquina, pero a un pasillo de tu salón.",
    ),
    (
        "punto-fit",
        "Punto Fit",
        "El punto de lo fresco dentro del campus. Fruta cortada, fresas con crema, granolas, "
        "yogur griego, pastas con verduras y wraps de pollo.",
    ),
    (
        "alegria",
        "Alegría",
        "Helados de vainilla, chocolate y fresa, sándwiches armados al momento, "
        "chocolatinas y mecato, con jugos, tés y café para acompañar.",
    ),
    (
        "almuerzo-01",
        "Almuerzo 01",
        "La línea oriental de la cafetería: pollo frito con arepitas, arroces, chow mein "
        "y pollo agridulce con arroz frito.",
    ),
    (
        "almuerzo-02",
        "Almuerzo 02",
        "El segundo punto de almuerzo del campus. Su carta está por definir.",
    ),
)

# (tienda, categoría, nombre, descripción, precio en centavos, existencias).
# Precios de frontend/lib/catalogo.ts: 350000 = $3.500.
PRODUCTOS = (
    ("antojos", "Snacks", "De todito grande", "Mezcla de snacks. Tres sabores: natural, queso y picante.", 350000, 14),
    ("antojos", "Snacks", "De todito pequeño", "Cuatro sabores: natural, queso, picante y limón.", 200000, 22),
    ("antojos", "Snacks", "Golpe con todo", "Mezcla completa de la marca, todos los sabores.", 350000, 9),
    ("antojos", "Snacks", "Cheetos", "Todos los sabores disponibles.", 250000, 12),
    ("antojos", "Snacks", "Doritos", "Bolsa individual.", 250000, 0),
    ("antojos", "Snacks", "Plátanos maduros", "Paquete de plátano maduro frito.", 150000, 16),
    ("antojos", "Snacks", "Plátanos", "Paquete de plátano frito.", 100000, 20),
    ("antojos", "Snacks", "Kraks (maní)", "Snack de maíz con maní.", 200000, 11),
    ("antojos", "Galletas y dulces", "Galletas Festival", "Galletas surtidas, todos los sabores.", 150000, 31),
    ("antojos", "Galletas y dulces", "Galletas Bridge", "Galleta individual.", 120000, 26),
    ("antojos", "Galletas y dulces", "Cocosette", "Barra de coco cubierta de chocolate.", 250000, 18),
    ("antojos", "Galletas y dulces", "Gol de chocolate con maní", "Barra de chocolate con maní.", 200000, 25),
    ("antojos", "Galletas y dulces", "Submarinos", "Postre de todos los sabores.", 250000, 8),
    ("antojos", "Galletas y dulces", "Bombombum bolsa", "Bolsa para compartir.", 300000, 7),
    ("antojos", "Galletas y dulces", "Bombombum personal", "Unidad personal.", 120000, 30),
    ("antojos", "Galletas y dulces", "Choco Break bolsa", "Bolsa para compartir.", 300000, 6),
    ("antojos", "Galletas y dulces", "Choco Break personal", "Unidad personal.", 120000, 28),
    ("antojos", "Galletas y dulces", "Chicles Trident", "Caja de chicles sin azúcar.", 100000, 40),
    ("antojos", "Bebidas", "Gaseosa Postobón", "Botella o lata, bien fría.", 250000, 24),
    ("antojos", "Bebidas", "Gaseosa Coca-Cola", "Botella o lata, bien fría.", 300000, 18),
    ("antojos", "Bebidas", "Gaseosa Pepsi", "Botella o lata, bien fría.", 280000, 15),
    ("antojos", "Bebidas", "Jugos Hit naturales", "Jugo natural en botella.", 250000, 21),
    ("punto-fit", "Frutas", "Pera", "Fruta fresca del día.", 200000, 12),
    ("punto-fit", "Frutas", "Manzana", "Fruta fresca del día.", 220000, 15),
    ("punto-fit", "Frutas", "Banano", "Fruta fresca del día.", 120000, 20),
    ("punto-fit", "Frutas", "Piña", "Porción de piña fresca.", 250000, 10),
    ("punto-fit", "Frutas", "Fresas con crema", "Fresas frescas con crema.", 750000, 8),
    ("punto-fit", "Granolas y yogur", "Granola", "Todos los sabores disponibles.", 650000, 13),
    ("punto-fit", "Granolas y yogur", "Granola con yogur griego", "Granola con yogur griego y fruta.", 950000, 6),
    ("punto-fit", "Granolas y yogur", "Helado de yogur griego", "Helado de yogur griego.", 800000, 9),
    ("punto-fit", "Bebidas", "Hatsu", "Té helado en botella.", 450000, 12),
    ("punto-fit", "Bebidas", "Tés", "Té caliente o frío.", 350000, 18),
    ("punto-fit", "Platos", "Pastas con verduras", "Pasta con verduras salteadas.", 1250000, 5),
    ("punto-fit", "Platos", "Wrap de pollo", "Wrap con pollo y verduras.", 1050000, 7),
    ("alegria", "Helados", "Helado de vainilla", "Una bola servida al momento.", 500000, 10),
    ("alegria", "Helados", "Helado de chocolate", "Una bola servida al momento.", 500000, 10),
    ("alegria", "Helados", "Helado de fresa", "Una bola servida al momento.", 500000, 0),
    ("alegria", "Helados", "Helado combinado", "Dos sabores a elección.", 600000, 8),
    ("alegria", "Sándwiches y mecato", "Sándwich", "Armado en el mostrador.", 950000, 6),
    ("alegria", "Sándwiches y mecato", "Chocolatina Jett", "Chocolatina individual.", 150000, 22),
    ("alegria", "Sándwiches y mecato", "Mecatos", "Surtido de la tienda.", 250000, 14),
    ("alegria", "Bebidas", "Jugos", "Jugo natural del día.", 450000, 12),
    ("alegria", "Bebidas", "Tés", "Té caliente o frío.", 350000, 15),
    # Los cuatro productos del seed anterior (catalog/seed.py + inventory/seed.py).
    ("alegria", "Bebidas", "Café americano", "Vaso de 8 oz", 350000, 40),
    ("alegria", "Sándwiches y mecato", "Empanada de queso", "Unidad recién hecha", 280000, 25),
    ("alegria", "Bebidas", "Jugo de naranja", "Botella de 300 ml", 450000, 18),
    ("alegria", "Sándwiches y mecato", "Sándwich mixto", "Jamón y queso", 900000, 12),
    # El nombre es único por tienda: la presentación distingue las variantes.
    ("almuerzo-01", "Platos", "Pollo frito con arepitas (entero)", "Pollo frito con arepitas fritas. Plato entero para compartir.", 4600000, 4),
    ("almuerzo-01", "Platos", "Pollo frito con arepitas (medio)", "Media porción de pollo frito con arepitas fritas.", 2300000, 6),
    ("almuerzo-01", "Platos", "Arroz oriental", "Porción de arroz oriental.", 1800000, 9),
    ("almuerzo-01", "Platos", "Arroz La Placita (media)", "Media porción de arroz La Placita.", 3450000, 5),
    ("almuerzo-01", "Platos", "Arroz La Placita (entero)", "Plato entero de arroz La Placita.", 4800000, 3),
    ("almuerzo-01", "Platos", "Arroz La Valenciana", "Plato entero de arroz La Valenciana.", 4370000, 3),
    ("almuerzo-01", "Platos", "Chow mein", "Pastas con pollo y verduras.", 1960000, 8),
    ("almuerzo-01", "Platos", "Pollo agridulce con arroz frito", "Pollo agridulce acompañado de arroz frito.", 1960000, 7),
)

# Tienda que recibe los productos exportados del esquema anterior.
TIENDA_LEGADO = "alegria"


def _asegurar_tiendas(session: Session) -> dict[str, int]:
    return {
        identificador: asegurar_tienda(
            session, identificador=identificador, nombre=nombre, descripcion=descripcion
        )
        for identificador, nombre, descripcion in TIENDAS
    }


def sembrar_demo(session: Session) -> dict[str, int]:
    """Siembra tiendas, categorías, productos y existencias de demostración."""
    tiendas = _asegurar_tiendas(session)
    categorias: dict[tuple[str, str], int] = {}
    existencias_creadas = 0
    for tienda, categoria, nombre, descripcion, precio, cantidad in PRODUCTOS:
        if (tienda, categoria) not in categorias:
            categorias[(tienda, categoria)] = asegurar_categoria(
                session, tienda_id=tiendas[tienda], nombre=categoria
            )
        producto_id = asegurar_producto(
            session,
            tienda_id=tiendas[tienda],
            nombre=nombre,
            descripcion=descripcion,
            precio_centavos=precio,
            categoria_id=categorias[(tienda, categoria)],
        )
        existencias_creadas += asegurar_existencia_inicial(session, producto_id, cantidad)
    return {
        "tiendas": len(tiendas),
        "productos": len(PRODUCTOS),
        "existencias_nuevas": existencias_creadas,
    }


def cargar_legado(session: Session, ruta: Path) -> dict[str, int]:
    """Carga productos y existencias exportados de catalog_products/inventory_stock."""
    # utf-8-sig tolera el BOM que añade PowerShell 5 al redirigir a archivo.
    datos = json.loads(ruta.read_text(encoding="utf-8-sig"))
    tablas = datos.get("tablas", {})
    productos = tablas.get("catalog_products", {}).get("filas", [])
    stock = {
        fila["product_id"]: fila["existencias"]
        for fila in tablas.get("inventory_stock", {}).get("filas", [])
    }
    tienda_id = _asegurar_tiendas(session)[TIENDA_LEGADO]
    cargados = omitidos = 0
    for fila in productos:
        nombre = str(fila.get("nombre") or "").strip()[:120]
        precio = int(fila.get("precio_centavos") or 0)
        if len(nombre) < 1 or precio < 0:
            omitidos += 1
            continue
        producto_id = asegurar_producto(
            session,
            tienda_id=tienda_id,
            nombre=nombre,
            descripcion=str(fila.get("descripcion") or "")[:400],
            precio_centavos=precio,
        )
        # Antes de API 0.3.0 el stock vivía en catalog_products.existencias.
        cantidad = stock.get(fila.get("id"), fila.get("existencias", 0)) or 0
        asegurar_existencia_inicial(session, producto_id, max(int(cantidad), 0))
        cargados += 1
    return {"legado_cargados": cargados, "legado_omitidos": omitidos}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Siembra datos de demostración.")
    parser.add_argument(
        "--desde-json",
        type=Path,
        help="JSON exportado por scripts/exportar_datos_legado.py (se carga primero).",
    )
    args = parser.parse_args(argv)

    engine = crear_engine(resolve_database_url(migraciones=True))
    resumen: dict[str, int] = {}
    # Una sola transacción: o queda todo sembrado o no queda nada.
    with sessionmaker(bind=engine, autoflush=False)() as session, session.begin():
        if args.desde_json:
            resumen |= cargar_legado(session, args.desde_json)
        resumen |= sembrar_demo(session)
    engine.dispose()
    print(json.dumps(resumen, ensure_ascii=False))


if __name__ == "__main__":
    main()
