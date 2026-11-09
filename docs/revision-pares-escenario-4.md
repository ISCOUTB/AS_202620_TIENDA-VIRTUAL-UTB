# Revisión de pares — medición del escenario 4

**Objeto revisado:** [medicion-escenario-4.md](medicion-escenario-4.md) y el
medidor [`measure_catalog_availability.py`](../backend/scripts/measure_catalog_availability.py).
**Resultado que se revisa:** 5 de 5 cargas correctas en 6 corridas, 0 errores,
`/health` 200, peor caso 41,78 ms; el escenario cumple su umbral en local.

**Formato:** cada integrante del equipo revisó la medición y emitió su opinión.
Cada hallazgo recibe un identificador (RP-n) que se traza en la sección 11 de
[arc42](arc42/arc42-template-EN.md#section-technical-risks).

## Opiniones

### Jasen Yukopila — validez del entorno de medición

- **Opinión:** el resultado es correcto, pero se obtuvo con cliente y servidor
  en la misma máquina (loopback), un solo proceso de Uvicorn y una base de datos
  efímera en contenedor. Los ≈ 42 ms son un piso optimista, no la latencia que
  vería un usuario del despliegue en Dokploy.
- **Hallazgo RP-1:** la medición acredita la lógica de la aplicación y las
  consultas bajo RLS, no el sistema desplegado.
- **Recomendación:** repetir la medición contra la URL de Dokploy desde otra
  red antes de afirmar disponibilidad del despliegue.
- **Veredicto:** aprueba el resultado con la reserva de alcance ya declarada
  en el informe.

### Alejandro Patron — suficiencia del umbral y de la carga

- **Opinión:** el umbral fija un número de usuarios (5) pero ningún límite de
  latencia, y un único nivel de carga no revela cuellos de botella. Pasar con
  5 usuarios no dice cuánto margen queda antes de fallar.
- **Hallazgo RP-2:** falta una rampa de carga y un criterio de latencia.
- **Recomendación:** medir 5 → 20 → 50 usuarios (el parámetro `--users` ya lo
  permite), añadir un límite de latencia al escenario y registrar el punto de
  saturación. Si aparece un cuello, evaluar la caché de
  [cache-s12.md](cache-s12.md) o más instancias.
- **Veredicto:** aprueba que el escenario cumple tal como está definido, pero
  considera el umbral débil.

### Levis Ortiz — fiabilidad del medidor

- **Opinión:** el campo `servidor_sigue_saludable` del medidor es una
  constante `true`; `/health` se consulta una sola vez, al final; y la
  coherencia se comprueba comparando conjuntos de IDs, no cantidades. Una caída
  durante la carga o una existencia incorrecta pasarían inadvertidas.
- **Hallazgo RP-3:** el medidor puede dar un falso positivo y su salida
  engaña a quien lea el JSON.
- **Recomendación:** que el campo refleje la respuesta real, consultar
  `/health` mientras corren los hilos y comparar cantidades contra la base.
- **Veredicto:** el resultado es creíble hoy porque la consulta final lanza
  excepción si falla, pero pide corregir el medidor antes de reutilizarlo como
  evidencia.

### Shalom Jhoanna — cobertura del atributo de calidad

- **Opinión:** el escenario se llama disponibilidad pero mide tolerancia a la
  concurrencia. Sigue habiendo una sola instancia de PostgreSQL en un solo
  servidor Dokploy, y el escenario 3 (existencias visibles en menos de 2 s) no
  tiene medición.
- **Hallazgo RP-4:** ningún escenario medido cubre la caída de la base de
  datos o del servidor, y dos de los cuatro escenarios no tienen evidencia de
  extremo a extremo.
- **Recomendación:** añadir un caso de fallo (detener la base, esperar un
  error controlado y la recuperación) y medir el escenario 3 cuando el flujo de
  pedidos esté en la interfaz. Mientras tanto, las copias de seguridad y el
  procedimiento de restauración siguen siendo la mitigación.
- **Veredicto:** aprueba la medición como evidencia de concurrencia, no de
  disponibilidad en sentido pleno.

## Síntesis

| Id | Hallazgo | Severidad | Estado |
|---|---|---|---|
| RP-1 | Medición solo local; latencias optimistas | Media | Abierto |
| RP-2 | Sin rampa de carga ni límite de latencia | Media | Abierto |
| RP-3 | Medidor con campo fijo y comprobaciones débiles | Media | Abierto |
| RP-4 | Sin escenario de fallo; escenario 3 sin medir | Alta | Abierto |

Ningún hallazgo invalida el resultado: los cuatro revisores coinciden en que el
escenario 4 cumple su umbral y en que ese umbral prueba menos de lo que su
nombre sugiere.
