# Revisión arquitectónica entre pares

Cada integrante evaluó la arquitectura de dos equipos distintos. Las lecturas se
hicieron sobre el contenido del repositorio de cada equipo (README, ADR, C4,
arc42, escenarios, mediciones, pruebas y flujos de CI) el 2026-11-08.

| Integrante | Equipos revisados |
|---|---|
| Jasen Yukopila | Recobra · uniTeam |
| Alejandro Patron | InvenTrack · XALD |
| Levis Ortiz | Clubs UTB · MAPSUTB |
| Shalom Jhoanna | Gimnasio UTB · CiberAi |

Cada revisión sigue la misma estructura: qué es el sistema, qué está bien
resuelto, qué observamos y qué recomendamos. Lo que otros equipos opinaron del
nuestro llega a [arc42 sección 11](arc42/11-riesgos-y-deuda-tecnica.md#112-what-the-peer-review-pointed-out-_peer_review).

---

## Jasen Yukopila

### Recobra — `AS_202620_Recobra`

**Qué es.** Plataforma para publicar y encontrar objetos perdidos en un espacio
delimitado, desplegada en Dokploy con PostgreSQL. 30 ADR y pruebas en CI.

**Qué está bien resuelto.**
- La medición S14 contrasta el escenario de búsqueda (p95 ≤ 400 ms con 200
  usuarios concurrentes) sobre el sistema **desplegado** y con cuatro niveles de
  carga (20, 50, 100 y 200). El peor caso, p97,5 de 203 ms, deja 197 ms de margen.
- Explican por qué usan p97,5: autocannon no reporta p95, y como p95 ≤ p97,5, si
  el segundo cumple, el primero también.
- Repiten una medición anterior porque entraron cabeceras de seguridad, límites
  de uso, ETag y Cloudflare en el camino de cada petición, y comparan antes y
  después.

**Observaciones.**
- Midieron con datos reales de producción: 2 publicaciones activas, y el filtro
  devuelve `[]`. Una búsqueda vacía no ejercita el costo de filtrar ni ordenar
  sobre un volumen realista, así que el margen puede ser optimista.
- El commit desplegado se asume por ser el HEAD de `master`; no lo confirmaron
  en el panel de Dokploy.

**Recomendación.** Repetir con un volumen sembrado en un entorno aparte, ya que
en producción los límites de publicación lo impiden, y declarar los dos
resultados juntos.

### uniTeam — `AS_202620_uniTeam`

**Qué es.** Gestión colaborativa de tareas para equipos: FastAPI, Next.js,
MySQL gestionado, Auth0 y eventos de dominio en proceso. Desplegado con URL
propia y 19 ADR.

**Qué está bien resuelto.**
- ESC-01 (tablero con 200 tareas y 30 usuarios) mide p95 de 762 ms frente a un
  umbral de 2 s y p99 de 1037 ms frente a 4 s, con 0 errores en 300 peticiones.
- El script de medición sale con código 1 si no se cumple el umbral, así que
  sirve como prueba.
- Declaran en una tabla en qué se diferencia el entorno medido del del
  escenario (MariaDB en vez de MySQL 8.4, un solo proceso, red local, solo API).

**Observaciones.**
- La medición es local y mide el código, no el sistema desplegado, como ellos
  mismos dicen. El margen de 1,2 s tiene que absorber la red, y no se sabe si lo
  hace.
- Hay dos ADR con número 0010 y dos con 0011 y 0012, lo que debilita la
  trazabilidad de decisiones.

**Recomendación.** Repetir ESC-01 contra la URL desplegada, que ya tienen, y
renumerar los ADR duplicados.

---

## Alejandro Patron

### InvenTrack — `AS_202620_InvenTrack`

**Qué es.** Inventarios con monolito modular y arquitectura hexagonal por
módulo, FastAPI, desplegado en Dokploy. 17 ADR.

**Qué está bien resuelto.**
- Experimento reproducible de concurrencia: 20 salidas simultáneas sobre el
  mismo SKU, integridad de stock final comprobada (100 → 80) y p95 de 32,9 ms
  frente a un umbral de 400 ms.
- Exponen el p95 en las métricas del servicio (ADR 0007).
- ADR sobre idempotencia, sagas y eventos de auditoría en los movimientos.

**Observaciones.**
- La exclusión por SKU usa `asyncio.Lock` y los repositorios están en memoria
  (ADR 0012). El bloqueo solo protege a un único proceso, y al reiniciar se
  pierde el estado, así que la garantía de consistencia no cubre más de una
  instancia ni una caída.
- La medición corre como prueba automatizada, no contra el despliegue, aunque
  el texto del escenario habla del "MVP desplegado".

**Recomendación.** Declarar el límite de un solo proceso como riesgo en arc42
sección 11 y medir una vez con la persistencia real.

### XALD — `AS_202620_XALD`

**Qué es.** App de finanzas personales offline-first con cliente Android y
backend FastAPI desplegado en Render. 17 ADR y 13 documentos de arc42.

**Qué está bien resuelto.**
- Midieron ESC-05, el escenario de mayor riesgo técnico de su árbol: 30
  transacciones en conflicto, con umbral de 100 % resueltas y 0 perdidas.
- Declaran la desviación respecto de lo planeado: un solo cliente HTTP simula
  los dos dispositivos, y no hay Sync Queue Android en la medición.
- Prueba automatizada (`test_lww.py`) y script propio, ambos reproducibles.

**Observaciones.**
- En `docs/medicion-esc05.md`, la tabla de resultados y la conclusión conservan
  todos los huecos sin rellenar (`___/30 conflictos`, `___ %`, "cumple / no
  cumple"), así que el documento no contiene ninguna cifra medida.
- El estado del Last-Write-Wins vive en el backend y la medición no valida
  persistencia ni los dos dispositivos reales.
- En Render Free el servicio duerme tras 15 minutos, lo que afecta cualquier
  medición de latencia.

**Recomendación.** Completar la tabla de resultados con la salida real de la
ejecución antes de cerrar la medición.

---

## Levis Ortiz

### Clubs UTB (LinkClub) — `AS_202620_Clubs_UTB`

**Qué es.** Gestión de avisos, eventos y grupos de clubes: Flutter, FastAPI y
PostgreSQL en Dokploy, arquitectura hexagonal, 11 ADR y 21 documentos de arc42.

**Qué está bien resuelto.**
- Documento de mediciones con un procedimiento por escenario (por ejemplo, 20
  repeticiones con Postman y umbral de 800 ms en el rendimiento) y entorno
  declarado.
- Sigue un hilo claro de decisiones: no incorporar LLM, validación de JWT,
  mensajería asíncrona de notificaciones.

**Observaciones.**
- En `docs/mediciones_calidad.md`, la sección de resultados de U1 (rendimiento)
  está vacía: hay procedimiento y umbral, pero no cifra ni conclusión.
- En U2 (disponibilidad) reconocen que `/health` puede responder bien aunque la
  base de datos esté caída y que aún no probaron interrumpir PostgreSQL.
- El número 0009 aparece en dos ADR distintos y la mensajería figura como 0009
  y 0010.

**Recomendación.** Rellenar los resultados con datos medidos, hacer que
`/health` verifique la base y renumerar los ADR.

### MAPSUTB — `AS_202620_mapsutb`

**Qué es.** Mapa interactivo del campus: app Flutter publicada como sitio web
en Firebase Hosting, sin backend propio. 18 ADR y 13 documentos de arc42.

**Qué está bien resuelto.**
- La disponibilidad se mide con una sonda horaria en GitHub Actions que
  publica `resumen.json` en una rama pública (ADR 0008): ≥ 99 % de
  disponibilidad y p95 del health check < 1 s sobre 7 días. Una métrica
  consultable y continua, no una foto puntual.
- Decisiones honestas de alcance: descartan la realidad aumentada y dejan el
  recorrido 360° como diferido, y lo dicen en el README.
- Ruteo con Dijkstra sobre un grafo propio y datos derivados de OpenStreetMap.

**Observaciones.**
- Al ser un sitio estático, la disponibilidad que miden es la del proveedor de
  hosting más que la de su arquitectura, así que el escenario discrimina poco
  entre alternativas de diseño.
- La sonda depende del propio Actions y del repositorio; si el flujo falla, se
  pierde la serie y no hay alerta.

**Recomendación.** Complementar con un escenario donde la arquitectura sí
influya, por ejemplo el tiempo de cálculo de una ruta con el grafo completo.

---

## Shalom Jhoanna

### Gimnasio UTB — `AS_202620_GimnasioUTB`

**Qué es.** Aforo del gimnasio: app Flutter, API Express y PostgreSQL en
Dokploy, arquitectura hexagonal, 7 ADR.

**Qué está bien resuelto.**
- Alcance honesto: el README dice que lo implementado es un backend de
  contador de aforo y que la app móvil, el QR y las notificaciones son futuros.
- El modelado de amenazas (S13) usa STRIDE sobre el C4 que existe hoy, con
  actores concretos y estados `IMPLEMENTADO`, `PENDIENTE` y `ACEPTADO`. Identifican que
  el actor más probable es un estudiante que falsea el aforo, y que el endpoint
  de acceso no pedía credencial, y lo corrigen con un token de operador (ADR 0007).
- ADR de concurrencia sobre PostgreSQL y de log de eventos de acceso.

**Observaciones.**
- No encontramos en `docs/` una medición contrastada con el umbral de un
  escenario de calidad, aunque sí pruebas de integración y de contrato.
- Un solo token de operador compartido no deja rastro de quién registró cada
  movimiento, y lo reconocen entre las amenazas.
- La numeración de ADR salta del 0001 al 0003 y hay un archivo con otro formato
  de nombre.

**Recomendación.** Medir un escenario (por ejemplo, la consulta del aforo bajo
carga concurrente) y documentarlo contra su umbral.

### CiberAi — `CiberAi`

**Qué es.** Agente local de seguridad de código: Bandit como analizador estático
más un modelo Qwen2.5-Coder afinado con QLoRA que decide si cada alerta es real
o un falso positivo. Corre en la máquina del usuario.

**Qué está bien resuelto.**
- Rigor experimental: conjunto de verificación reservado, comparación pareada
  con el modelo base, auditoría de falsos negativos y reporte del análisis de
  sensibilidad sin cambiar el resultado pre-registrado.
- Diseño seguro ante el error: el modo asesor nunca elimina una alerta del
  reporte y, ante una respuesta dudosa o un servicio caído, la conserva como
  sospechosa.
- Todo es local: no se envía código a ninguna API externa.

**Observaciones.**
- No hay ADR, y en el repositorio no hay flujo de CI ni un arc42 desglosado por
  secciones (un único documento). Las decisiones existen en los informes, pero
  no se pueden rastrear como decisiones de arquitectura.
- El repositorio versiona binarios de `llama.cpp` (`.exe` y `.dll`) en
  `training/llama-bin/`, lo que incrementa su tamaño y es un punto de cadena de
  suministro difícil de auditar.
- Es un proyecto de investigación sobre un modelo, no un sistema con
  componentes desplegados, por lo que escenarios como disponibilidad o
  despliegue encajan poco.

**Recomendación.** Registrar las decisiones clave (modo asesor, formato de
salida, uso de Ollama) como ADR, sacar los binarios del repositorio y añadir un
flujo de pruebas.
