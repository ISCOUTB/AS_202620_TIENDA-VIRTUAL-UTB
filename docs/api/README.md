# Evidencia de contrato e integración

Consulta la [documentación del contrato y sus diagramas](contrato-api.md) para
entender las operaciones, los campos de respuesta y el propósito de `GET /health`.

La corrección de S7 incorpora al [administrador de la tienda y su flujo de gestión](administracion-catalogo.md)
como diseño previsto: actores, diagramas, operaciones propuestas y alcance pendiente.

## Archivos para entregar

| Requisito | Evidencia |
|---|---|
| Contrato OpenAPI versionado | [openapi.json](openapi.json): formato OpenAPI `3.1.0`, versión de API `0.2.0`. |
| Pruebas de contrato | [test_openapi.py](../../backend/tests/contract/test_openapi.py): documento, sincronización, respuestas HTTP y rupturas simuladas. |
| Pruebas en el pipeline | [tests.yml](../../.github/workflows/tests.yml): paso específico y reporte JUnit descargable. |
| Justificación de integración | [ADR 0002](../adr/0002-contrato-integracion-http.md). |

El contrato describe `GET /catalog/products` y `GET /health`, ambas con respuesta
`200 application/json`, sin autenticación ni parámetros en el alcance actual.
No se documentan operaciones futuras como si ya estuvieran implementadas.
JSON y YAML son formatos válidos para OpenAPI; este proyecto exporta JSON.

## Reproducir las pruebas

Desde la raíz, con Python 3.12 y un entorno virtual activado:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m pytest -c backend/pytest.ini backend/tests/contract -v -p no:cacheprovider
python -m pytest -c backend/pytest.ini backend/tests -p no:cacheprovider
```

Usar `DATABASE_URL=sqlite+pysqlite:///:memory:` o dejar esa variable sin definir
para las pruebas locales; la aplicación usa SQLite en memoria por defecto.

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

Validación local del 2026-09-15: **11 pruebas aprobadas**, de las cuales **6 son
de contrato**, con Python 3.12.10 y SQLite en memoria. Se observaron avisos de
deprecación de dependencias; no hubo fallos. En esta máquina se utilizaron
dependencias aisladas en `.contract-tools/`, excluidas de Git.

La ejecución remota de GitHub Actions queda pendiente de subir los cambios.
Para cerrar la entrega, el equipo debe revisar el ADR, incorporar los archivos
a Git y conservar el enlace de la ejecución de **Pruebas**, el commit asociado
y el artefacto **pruebas-contrato**. Una ejecución local no acredita que GitHub
Actions ya haya corrido.
