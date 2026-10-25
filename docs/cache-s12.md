# S12 — Diseño de caché e invalidación

Fecha: 2026-10-25. Estado: diseño propuesto, no implementado.

## Situación actual y objetivo

[Next.js](../frontend/lib/catalogo-servidor.ts) consulta productos e inventario
con `no-store`; `cache()` evita repetir la composición dentro de una petición.
El respaldo `PRODUCTOS` es contenido estático identificado como respaldo y
no permite reservar. No es una caché de la última lectura válida.
El [stack](../deploy/compose.lab.yaml) no contiene Redis.

Se propone reducir lecturas repetidas de datos descriptivos públicos del
catálogo, conservando el inventario y las decisiones de compra en PostgreSQL.
No se cambia el objetivo de reflejar stock al recargar del
[escenario 3](escenarios-calidad.md). El beneficio de rendimiento aún debe
medirse: no se afirma una reducción de latencia sin una implementación.

## Datos, ubicación y claves

Diseño: caché compartida Redis consultada por el backend mediante
cache-aside (buscar en caché; ante ausencia, leer PostgreSQL y guardar).
El frontend mantiene `no-store`; así no hay una segunda política de
invalidación de datos en Next.js. No se cachean respuestas autenticadas.

| Dato | Política propuesta | Clave y vigencia |
|---|---|---|
| Lista pública de productos activos | Cachear solo solicitudes anónimas; mismo contrato y filtros que la API. | `utb:catalog:v1:public:products:<consulta-normalizada>`; TTL absoluto de 30 s. |
| Detalle público de producto activo | Cachear únicamente resultados 200 anónimos. | `utb:catalog:v1:public:product:<id>`; TTL absoluto de 30 s. |
| Inventario y disponibilidad | No cachear. | Lectura de PostgreSQL en cada petición. |
| Pedidos, historial, identidad, roles y vistas administrativas | No cachear. | Lectura autenticada con autorización y RLS. |
| Errores, respuestas vacías por fallo y productos inactivos | No guardar como resultados válidos. | Se conserva el tratamiento de errores actual. |

La consulta normalizada incluye todos los parámetros admitidos que alteren
el resultado, ordenados y con valores por defecto explícitos. Se rechazan
parámetros no admitidos antes de construir la clave. El prefijo `v1` cambia
al modificar el formato almacenado. Una petición con credenciales omite
por completo esta caché, para no mezclar productos inactivos o permisos.

## Lectura y caducidad

1. Validar que sea una consulta pública cacheable.
2. Buscar la clave. Devolverla solo si no ha vencido su fecha absoluta.
3. En una ausencia, fijar `t0` antes de iniciar una nueva lectura de BD.
4. Leer PostgreSQL y guardar el resultado con vencimiento `t0 + 30 s`.
   Si la lectura termina después de esa fecha, no guardarlo. Un hit no renueva TTL.
5. Una lectura que comience antes de una edición podría repoblar datos viejos
   después de invalidarlos. Anclar el vencimiento a `t0` limita esa carrera:
   nunca se conceden otros 30 s a partir de la escritura tardía en Redis.

La tolerancia propuesta es de hasta 30 s de antigüedad para metadatos; no
incluye tiempo de red ni una pantalla que permanece abierta sin recargar.
No se promete lectura inmediata de una edición desde el catálogo público.
La administración omite caché y permite comprobar su escritura confirmada.

## Invalidación después del commit

| Evento | Acción propuesta |
|---|---|
| Crear producto | Eliminar todas las variantes de lista pública. |
| Editar nombre, precio, presentación, categoría, imagen o confirmación de precio | Eliminar detalle del producto y todas las variantes de lista pública. |
| Activar, desactivar o cambiar tienda de un producto | Eliminar detalle y todas las variantes de lista pública, incluidas las de tienda anterior y nueva. |
| Crear/cancelar/vencer pedido o ajustar stock | No invalidar metadatos: el inventario no está cacheado. |
| Siembra, importación o mantenimiento SQL de catálogo | Invalidar el espacio público de catálogo al terminar; si no se ejecuta, opera el límite de TTL. |
| Rollback de escritura | No invalidar: no hubo modificación confirmada. |

La implementación debe mantener un índice de claves de listas para eliminarlas
sin ejecutar `KEYS` sobre Redis; la limpieza debe tolerar claves ya vencidas.
La invalidación se invoca después del commit, nunca antes. No existe una
transacción conjunta PostgreSQL–Redis: si el proceso muere después de
confirmar y antes de invalidar, el TTL es el mecanismo de recuperación.
Un fallo de invalidación se registra y no convierte una escritura confirmada
en un error aparente para el comprador o administrador.

## Fallos y autoridad de los datos

- Redis indisponible: omitir caché y consultar PostgreSQL, con presupuesto
  inicial de 100 ms para acceso a Redis; ajustar ese valor con mediciones.
- PostgreSQL indisponible: un hit vigente puede servir metadatos públicos,
  pero no stock ni autorización para comprar. Si falla la composición con
  inventario, se mantiene el respaldo señalado por la interfaz y se bloquea
  la reserva. No servir entradas vencidas como si fueran actuales.
- Precio o actividad desactualizados: `POST /orders` vuelve a consultar el
  producto y reduce las existencias en PostgreSQL. El precio guardado es el vigente
  en esa lectura, no el recibido del navegador. El frontend debe mostrar el
  total devuelto; el diseño no promete congelar el precio visto previamente.
- Una desactivación puede tardar hasta el TTL en desaparecer del catálogo
  público; la creación de pedidos valida disponibilidad contra BD. Si el
  negocio exige retirada visual inmediata, esta política debe revisarse.

## Validación requerida antes de habilitar

| Caso | Resultado esperado |
|---|---|
| Dos lecturas públicas iguales | La segunda es hit; conserva el contrato HTTP. |
| Editar y confirmar un producto | Invalida detalle y todas las listas; una lectura posterior al fin de las lecturas antiguas devuelve el cambio. |
| Editar y hacer rollback | No publica cambios ni invalida por una escritura fallida. |
| Pausar una lectura antigua, editar, invalidar y reanudarla | La entrada antigua no sobrevive a `t0 + 30 s`. |
| Fallar invalidación o terminar el proceso tras commit | El dato viejo desaparece por vencimiento absoluto. |
| Consultar como administrador y luego como anónimo | La consulta pública nunca recibe productos privados/inactivos ni datos de roles. |
| Reservar o cancelar con catálogo cacheado | Stock consultado directamente; nunca se admite sobreventa. |
| Caída de Redis / caída de PostgreSQL | Se cumple la degradación descrita y no se habilita compra con respaldo. |

Medir hits, misses, errores de Redis, invalidaciones fallidas, lecturas de BD
y latencia p95 con el mismo conjunto de consultas antes/después. Estos
contadores y pruebas todavía no existen; son criterios de implementación,
no resultados de S12. La [tabla de consistencia](consistencia-s12.md) describe
las garantías actuales sin atribuirles esta caché futura.
