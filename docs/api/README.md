# Evidencia de contrato e integración

Consulta la [documentación del contrato y sus diagramas](contrato-api.md) para
entender las operaciones, los campos de respuesta y el propósito de `GET /health`.

La [administración del catálogo](administracion-catalogo.md) está implementada:
incluye creación, edición, activación y permisos por tienda.

## Archivos para entregar

| Requisito | Evidencia |
|---|---|
| Contrato ejecutable | [openapi.json](openapi.json), OpenAPI `3.1.0`, API `0.5.0`, 20 operaciones HTTP. |
| Contrato del frontend | [tienda-virtual.yaml](../openapi/tienda-virtual.yaml), fuente de [tipos generados](../../frontend/lib/api/generated/contract.ts). |
| Pruebas de contrato | [test_openapi.py](../../backend/tests/contract/test_openapi.py): documento, sincronización y respuestas HTTP. |
| Pipeline | [tests.yml](../../.github/workflows/tests.yml): pruebas sobre PostgreSQL y reporte JUnit. |
| Decisión | [ADR 0002](../adr/0002-contrato-integracion-http.md). |

La API expone identidad, catálogo, inventario, pedidos, salud y métricas.
Las operaciones protegidas usan Bearer JWT y roles por tienda; los parámetros,
entradas y errores se detallan en el [contrato](contrato-api.md).

## Reproducir las pruebas

Desde la raíz, con Python 3.12 y un entorno virtual activado:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m pytest -c backend/pytest.ini backend/tests/contract -v -p no:cacheprovider
python -m pytest -c backend/pytest.ini backend/tests -p no:cacheprovider
```

Las pruebas requieren PostgreSQL: `DATABASE_URL` debe apuntar a una base de
pruebas (su nombre debe contener `test`) y debe existir el rol de aplicación.
Ya no hay respaldo a SQLite (ADR 0013); los pasos están en el README, sección
*Pruebas automatizadas*.

## Actualizar el contrato deliberadamente

1. Revisar el impacto del cambio sobre Next.js y aplicar el versionado del ADR.
2. Actualizar rutas/modelos y la versión de FastAPI cuando corresponda.
3. Ejecutar desde la raíz:

   ```bash
   python backend/scripts/export_openapi.py
   ```

4. Revisar las diferencias en `docs/api/openapi.json` y ajustar los casos de prueba.
5. Ejecutar las pruebas e incorporar código, contrato y pruebas en el mismo commit.

No regenerar automáticamente el contrato antes de las pruebas del pipeline:
eso eliminaría la referencia contra la cual se detectan cambios no revisados.

## Resultado y cierre de la evidencia

La validación del 2026-09-15 (11 pruebas, 6 de contrato, SQLite) corresponde al
contrato inicial. Desde el ADR 0013 las pruebas requieren PostgreSQL y el
contrato creció a las operaciones actuales. Las [E2E de octubre](../pruebas-e2e-testsprite.md)
son evidencia histórica, no una nueva corrida del commit de cierre.

El workflow ya está versionado. Para la entrega final conservar el enlace de
la ejecución de **Pruebas**, el commit y el artefacto **pruebas-contrato**;
registrar el resultado real según la [matriz de cierre](../cierre-proyecto.md).
