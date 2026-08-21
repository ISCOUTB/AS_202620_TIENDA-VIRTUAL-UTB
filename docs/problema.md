# Ficha del problema: Tienda Virtual UTB
## Contexto y problema

La comunidad de la Universidad Tecnológica de Bolívar necesita un medio
centralizado para conocer y adquirir productos de la cafetería. Cuando el catálogo, los precios, la disponibilidad y el estado de los pedidos se gestionan mediante tareas manuales, a veces es tedioso para los compradores tener que llegar a uno de los puntos de venta para encontrarse con una larga fila o descubrir que el producto que desean no está disponible en el momento.

La Tienda Virtual UTB propone reunir el catálogo y el proceso básico de compra en un sistema web. Así, la comunidad podrá consultar información actualizada y realizar pedidos, mientras el personal autorizado administra productos, existencias y estados de los pedidos.

## Usuarios

- **Compradores:** estudiantes, docentes, funcionarios y egresados que consultan productos y realizan o revisan sus pedidos.

- **Administradores de la tienda:** personal autorizado que registra productos, precios y estados de los pedidos.

- **Responsables de inventario:** personal que consulta y actualiza las
existencias disponibles.

## Alcance inicial

El sistema permitirá consultar y buscar productos, gestionar un carrito, crear y consultar pedidos, administrar el catálogo y llevar un control básico de existencias. La inclusión de pagos en línea dependerá de la disponibilidad de una pasarela y de las restricciones institucionales que se confirmen.

Quedan fuera del alcance inicial una aplicación móvil nativa, las ventas de terceros, los envíos nacionales, las recomendaciones mediante inteligencia artificial y la integración simultánea con múltiples pasarelas de pago.

## Tensiones de calidad

1. **Facilidad de uso frente a seguridad.** La compra debe requerir pocos pasos, pero el sistema también debe autenticar a los usuarios y restringir el acceso a información y operaciones sensibles.

2. **Precisión del inventario frente a disponibilidad y rendimiento.** Las existencias deben reflejar las compras oportunamente para evitar vender productos agotados, sin que la sincronización vuelva lenta o frágil la tienda.

## Resultado esperado

Una aplicación web que haga más claro y trazable el proceso de consulta y compra de productos de la cafeteria, y que reduzca el trabajo manual necesario para administrar el catálogo, el inventario y los pedidos.
