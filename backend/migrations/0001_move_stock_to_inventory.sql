-- Migración PostgreSQL para instalaciones creadas antes de API 0.3.0.
-- Ejecutar con la aplicación detenida y una copia de seguridad verificada.
BEGIN;

CREATE TABLE IF NOT EXISTS inventory_stock (
    product_id INTEGER PRIMARY KEY,
    existencias INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_inventory_stock_nonnegative CHECK (existencias >= 0)
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'catalog_products'
          AND column_name = 'existencias'
    ) THEN
        INSERT INTO inventory_stock (product_id, existencias)
        SELECT id, existencias FROM catalog_products
        ON CONFLICT (product_id) DO UPDATE
        SET existencias = EXCLUDED.existencias;

        ALTER TABLE catalog_products DROP COLUMN existencias;
    END IF;
END
$$;

COMMIT;
