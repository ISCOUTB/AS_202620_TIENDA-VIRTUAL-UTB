# Tienda Virtual UTB

Proyecto académico para diseñar una tienda virtual dirigida a la comunidad de la Universidad Tecnológica de Bolívar (UTB).

## Equipo

| Integrante | Correo institucional | Codigo Institucional |
|---|---|---|
| Levis Adrian Ortiz Cano | levortiz@utb.edu.co | T00083674 |
| Alejandro Patron Montero | patrona@utb.edu.co | T00078181 |
| Shalom Jhoanna Arrieta Marrugo | sharrieta@utb.edu.co | T00082962 |
| Jasen Mihovil Yukopila Escobar| jyukopila@utb.edu.co | T00083873 |


## Problema

La comunidad UTB necesita un canal centralizado y confiable para consultar y adquirir productos de la cafetería. La información sobre productos, precios, existencias y pedidos puede encontrarse dispersa o depender de gestiones manuales. La Tienda Virtual UTB busca facilitar este proceso mediante un catálogo digital y la gestión básica de pedidos e inventario.

La descripción completa de usuarios, alcance y tensiones de calidad se encuentra
en la [ficha del problema](docs/problema.md).

## Evidencia S1

- [Ficha del problema](docs/problema.md)
- [Aspectos de calidad](docs/aspectos.md)
- [Registro de uso de inteligencia artificial](docs/ia.md)
- [Disponibilidad técnica y de despliegue](docs/disponibilidad.md)
- [Documentación arc42](docs/arc42/arc42-template-EN.md)

## Evidencia S2

- [arc42 secciones 1-3](docs/arc42/arc42-template-EN.md) (Introduction and Goals, Architecture Constraints, Context and Scope)
- [Árbol de utilidad](docs/arbol-utilidad.md)
- [Escenarios de calidad](docs/escenarios-calidad.md)
- [C4 de contexto](docs/c4/context.md)

## Evidencia S3 — estrategia y esqueleto ejecutable

- [arc42 sección 4: estrategia de solución](docs/arc42/arc42-template-EN.md)
- [Matriz comparativa de estilos arquitectónicos](docs/matriz-comparativa-arquitectura.md)
- [ADR 0001: monolito modular](docs/adr/0001-monolito-modular.md)

La estrategia elegida es un **monolito modular**: un backend FastAPI único,
separado inicialmente en identidad, catálogo, inventario y pedidos. Next.js es
el cliente web y PostgreSQL el almacenamiento.

## Evidencia S4 — incremento arc42, C4 y corte vertical

- [arc42 secciones 1–6, 9, 10 y glosario](docs/arc42/arc42-template-EN.md) — el
  documento arc42 se mantiene en inglés (`arc42-template-EN.md`). Este incremento
  añade las secciones 5–6 (bloques de construcción y tiempo de ejecución), 9
  (decisiones), 10 (requisitos de calidad) y el glosario inicial; por continuidad
  del documento también quedan pobladas 7 (despliegue), 8 (conceptos
  transversales) y 11 (riesgos).
- [C4 nivel 1 — contexto](docs/c4/context.md) y [C4 nivel 2 — contenedores](docs/c4/container.md)
- [Tabla de aspectos de calidad](docs/aspectos.md) (fila de disponibilidad completa hasta pruebas)

### Corte vertical ejecutable: consultar el catálogo

Una funcionalidad implementada de extremo a extremo sobre el esqueleto:

```
Navegador → Next.js (frontend/app/page.tsx)
          → FastAPI  GET /catalog/products  (backend/app/modules/catalog/router.py)
          → repositorio + ORM SQLAlchemy    (repository.py, models.py)
          → PostgreSQL  tabla catalog_products  (sembrada al arrancar, seed.py)
```

- La API arranca creando el esquema y sembrando un catálogo mockeado de forma
  idempotente (`backend/app/main.py`, `lifespan`).
- El cliente web renderiza la lista de productos en el servidor; si la API no
  responde, muestra un mensaje de error en lugar de fallar.

Comandos:

```bash
# Arrancar el corte vertical completo (web + API + base de datos)
docker compose up --build

# Correr la prueba automatizada del corte vertical (sin contenedores)
python -m pip install -r backend/requirements-dev.txt
python -m pytest -c backend/pytest.ini backend/tests/test_catalog.py
```

Tras el arranque: <http://localhost:3000> (catálogo) y
<http://localhost:8000/catalog/products> (JSON).

Los módulos `identity`, `inventory` y `orders` siguen siendo paquetes vacíos,
reservados para incrementos posteriores.

## Arranque con un solo comando

### Requisito

- Docker con el complemento Docker Compose.

### Ejecución

Desde la raíz del repositorio:

```bash
docker compose up --build
```

Cuando los servicios estén saludables:

- Aplicación web (catálogo): <http://localhost:3000>
- API: <http://localhost:8000>
- Catálogo (JSON): <http://localhost:8000/catalog/products>
- Comprobación de salud: <http://localhost:8000/health>
- Documentación OpenAPI: <http://localhost:8000/docs>

Para detener los servicios, presione `Ctrl+C`. Los datos de desarrollo de
PostgreSQL se conservan en un volumen de Docker. Si se necesita eliminar
también ese volumen, puede ejecutarse explícitamente `docker compose down -v`;
esta operación borra los datos locales de la base de datos.

## Pruebas automatizadas

Con Python 3.12 disponible, las pruebas del backend pueden ejecutarse así:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m pytest -c backend/pytest.ini backend/tests
```

Las pruebas comprueban que la ruta de salud funciona, que existen los paquetes
establecidos por el ADR y que el endpoint del catálogo devuelve los productos
sembrados con el contrato esperado. Se ejecutan sobre SQLite en memoria (sin
contenedores). El mismo conjunto corre automáticamente mediante GitHub Actions
en cada envío y solicitud de cambios.

## Estructura ejecutable

```text
backend/
  app/
    main.py                     # app FastAPI, /health, arranque (esquema + seed)
    modules/
      catalog/                  # corte vertical: router, repository, models, schemas, seed
      {identity,inventory,orders}/   # paquetes reservados, aún vacíos
    shared/database.py          # engine, sesión y Base (solo acceso a datos)
  tests/                        # health, límites de módulos (ADR), catálogo
frontend/
  app/page.tsx                  # vista del catálogo (componente de servidor)
compose.yaml                    # frontend + backend + postgres
```

## Estructura de arquitectura

- `docs/arc42/`: documentación de arquitectura basada en la plantilla del curso.
- `docs/adr/`: registros de decisiones arquitectónicas.
- `docs/c4/`: diagramas del modelo C4.

Hasta aqui llega todos los avances relacionados con el primer corte
