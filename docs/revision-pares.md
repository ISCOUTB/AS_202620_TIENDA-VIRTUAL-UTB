# Revisión arquitectónica entre pares

Cada integrante revisó la arquitectura de dos equipos. El criterio principal fue
que **las decisiones tomadas estén en los ADR y que el código las refleje tal
como dicen**, sin que el documento diga una cosa y la práctica otra. Para
comprobarlo se cruzó cada ADR con el código del repositorio del equipo y se
revisó la medición de calidad que presenta (fecha de lectura: 2026-11-08).

| Integrante | Equipos revisados |
|---|---|
| Jasen Yukopila | Recobra · uniTeam |
| Alejandro Patron | InvenTrack · XALD |
| Levis Ortiz | Clubs UTB · MAPSUTB |
| Shalom Jhoanna | Gimnasio UTB · CiberAi |

Lo que otros equipos opinaron del nuestro está en
[arc42 sección 11](arc42/11-riesgos-y-deuda-tecnica.md#112-what-the-peer-review-pointed-out-_peer_review).

---

## Jasen Yukopila

### Recobra

- Los ADR se reflejan en el código: la política de caché con ETag, las cabeceras
  de seguridad y CSP, el límite de uso, el correo institucional y las sesiones
  opacas con hash `scrypt` están donde los ADR dicen que están.
- La medición S14 se hizo sobre el sistema desplegado y con cuatro niveles de
  carga (20, 50, 100 y 200). Explican por qué usan p97,5 en lugar de p95.
- Midieron con 2 publicaciones activas y el filtro devolvió `[]`, así que no se
  prueba el costo de buscar sobre un volumen real. Falta repetirla con datos
  sembrados en un entorno aparte.
- El commit desplegado se asume por ser el último de `master`; no lo confirmaron
  en el panel.

### uniTeam

- Casi todo coincide con los ADR: Auth0, MySQL y el bus de eventos en proceso
  están en el código, y el ADR 0013 se cumple (las tareas no importan
  proyectos).
- **El ADR 0012 (límite de peticiones por usuario e IP mediante middleware) no
  se refleja en el código**: `app/main.py` solo registra observabilidad, gzip y
  CORS. El ADR está marcado como "Propuesto", pero describe la decisión como si
  se aplicara. Hay que dejar claro que aún no está hecho.
- Hay números de ADR repetidos (0010, 0011 y 0012 aparecen dos veces), lo que
  dificulta rastrear decisiones.
- ESC-01 (p95 de 762 ms frente a 2 s, 0 errores) cumple, pero se midió en local
  con MariaDB y un solo proceso, no en el sistema desplegado que ya tienen.

---

## Alejandro Patron

### InvenTrack

- La exclusión por SKU con `asyncio.Lock` y los repositorios en memoria que
  dicen los ADR 0002 y 0012 están en el código tal cual.
- Esa coherencia revela el límite: sin base de datos (no hay SQLAlchemy ni
  psycopg), el bloqueo solo protege a un proceso y todo se pierde al reiniciar.
  Debería figurar como riesgo, no solo como decisión del MVP.
- El experimento de concurrencia es bueno y reproducible (20 salidas sobre el
  mismo SKU, stock final 80, p95 de 32,9 ms frente a 400 ms), pero corre como
  prueba automatizada y el texto lo presenta como "MVP desplegado".
- Tienen 17 ADR; conviene comprobar que los de almacenamiento (0014 y 0015) no
  prometen más persistencia de la que existe.

### XALD

- **El ADR 0004 dice que la base local va cifrada con AES-256 mediante Android
  KeyStore. En el código solo encontré la mención en un comentario de
  `TransaccionEntidad.kt`**; no vi el uso de KeyStore ni de una base cifrada.
  Es el caso típico de lo que el documento dice y la práctica no muestra.
- Lo demás sí coincide: la autenticación por `X-API-Key` (ADR 0004 y 0015) está
  en el cliente (`X-API-Key`) y el backend acepta varias llaves vigentes para poder rotarlas.
- La medición de ESC-05 está declarada con honestidad (un cliente HTTP simula
  los dos dispositivos), pero **la tabla de resultados y la conclusión están
  sin rellenar** (`___/30`, `___ %`), así que no hay ninguna cifra medida.
- El estado de Last-Write-Wins vive en memoria y se pierde al reiniciar; el
  documento lo reconoce.

---

## Levis Ortiz

### Clubs UTB

- El ADR 0010 se cumple: elige un transporte simulado en memoria y el código
  tiene `in_memory_broker.py`, `outbox.py` y su prueba. Dice qué cambiaría si
  hiciera falta un broker real.
- La validación de JWT (ADR 0006) está en `auth_dependency.py` y se aplica a
  las rutas de escritura.
- En `mediciones_calidad.md` la sección de resultados de rendimiento está
  vacía: hay procedimiento y umbral de 800 ms, pero ninguna cifra.
- En disponibilidad reconocen que `/health` puede responder bien con la base
  caída y que aún no probaron cortar PostgreSQL. Lo que el escenario promete no
  está demostrado.
- Hay dos ADR con el número 0009, y la mensajería aparece como 0009 y 0010.

### MAPSUTB

- Las decisiones del ADR están en el código: Dijkstra sobre grafo propio, mapa
  con `flutter_map`, GPS con `geolocator` y secretos por `dart-define`.
- Buen manejo del alcance: descartan la realidad aumentada y dejan el 360°
  como diferido, y lo escriben en el README.
- La disponibilidad se mide con una sonda horaria en GitHub Actions que publica
  `resumen.json`, una métrica continua y consultable.
- Al ser un sitio estático, lo que miden es la disponibilidad del hosting más
  que de su arquitectura. Falta un escenario donde sus decisiones influyan,
  por ejemplo el tiempo de cálculo de una ruta con el grafo completo.

---

## Shalom Jhoanna

### Gimnasio UTB

- Es el equipo más honesto con el estado de sus ADR: el ADR 0006 (log de
  eventos de acceso) dice "Diseño, no implementado" y el código, en efecto,
  solo guarda el contador.
- Lo que sí declaran implementado coincide: el token de operador y la lista
  blanca de CORS (ADR 0007) están en `server.js` y en `shared/http/seguridad.js`.
- El modelado de amenazas parte del C4 real y usa estados `IMPLEMENTADO`,
  `PENDIENTE` y `ACEPTADO`.
- No encontré una medición contrastada con el umbral de un escenario de calidad.
- La numeración de ADR salta del 0001 al 0003 y hay un archivo con otro formato
  de nombre.

### CiberAi

- Lo que promete el README sí está en el código: ante una respuesta inválida
  la alerta se conserva como `SOSPECHOSA`, y las reglas protegidas (B403) nunca
  se recomiendan para descarte. La única llamada de red que encontré es al
  cliente local de Ollama.
- **No tiene ADR**: las decisiones están en informes, así que no se puede
  comprobar si el código sigue lo decidido porque no hay decisión registrada
  como tal.
- El repositorio versiona 51 binarios (`.exe` y `.dll` de `llama.cpp` en
  `training/llama-bin/`), un punto de cadena de suministro difícil de auditar.
- No tiene flujo de CI y su arc42 es un solo documento.
- Rigor experimental alto (conjunto reservado, comparación pareada, auditoría de
  falsos negativos), pero es un proyecto de modelo, no un sistema desplegado:
  escenarios como disponibilidad encajan poco.
