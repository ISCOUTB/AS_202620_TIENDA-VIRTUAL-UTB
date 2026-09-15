# Imagen de presentación: consulta del catálogo

- Archivo: [consulta-catalogo-presentacion.png](consulta-catalogo-presentacion.png).
- Generación: herramienta integrada `image_gen`, 2026-09-15.
- Uso: lámina horizontal para presentar el escenario exitoso del catálogo.
- Revisión visual: participantes, rutas, campos y dirección de las respuestas contrastados con el flujo documentado.

## Prompt utilizado

```text
Use case: infographic-diagram.
Create a polished Spanish presentation slide image, landscape 16:9, high resolution, for an academic software architecture presentation. Title: "Consulta del catálogo". Subtitle: "Tienda Virtual UTB · Flujo HTTP síncrono".
Use a clean white background, navy text, blue request arrows and teal response arrows, generous spacing, elegant large sans-serif text, small simple line icons, no logos or watermark.
Main content is an accurate sequence diagram with five clearly separated vertical lifelines. Headers exactly left to right: "Usuario", "Next.js (servidor)", "FastAPI", "Repositorio de catálogo", "PostgreSQL". Keep the repository header wrapped for readability. Use small person, browser/server, API, code and database icons above headers.
Chronological arrows from top to bottom, with exact labels and correct direction:
1 Usuario -> Next.js: "Abrir la tienda"
2 Next.js -> FastAPI: "GET /catalog/products"
3 FastAPI -> Repositorio: "list_products(session)"
4 Repositorio -> PostgreSQL: "Consultar productos por nombre"
5 PostgreSQL -> Repositorio: "Filas de catalog_products"
6 Repositorio -> FastAPI: "Productos"
At FastAPI, small neat callout: "Serializa como lista de ProductOut"
7 FastAPI -> Next.js: "200 application/json · Lista de productos"
8 Next.js -> Usuario: "Página con el catálogo"
Requests solid blue arrows, responses dashed teal arrows, aligned readable labels with no line/text overlap. All return arrows point LEFT.
Bottom concise three cards titled "Petición", "Contrato", "Resultado". Card text respectively: "GET /catalog/products", "ProductOut: id, nombre, descripcion, precio_centavos, existencias", "Nombres, precios y existencias". Footer: "Escenario exitoso en Docker Compose". Make technical strings exact including unaccented schema field names. Professional balanced editorial layout, legible at presentation distance. This is the catalog flow only, no health endpoint, no invented components.
```
