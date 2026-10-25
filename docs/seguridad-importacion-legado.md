# Diagnóstico de la alerta de rutas en la importación de legado

Fecha: 2026-10-25.

## Hallazgo y reproducción

La alerta señala `argparse.parse_args(argv)` como origen de una ruta que
termina en `Path.read_text()` dentro de `seed.cargar_legado()`. El recorrido
existía: `--desde-json` aceptaba cualquier `Path` accesible al proceso.

Se reprodujo con un directorio temporal que contenía `importaciones/` y un
archivo hermano `fuera.json`, cuyo contenido era `{"tablas": {}}`. Se llamó a
la función anterior con `importaciones/../fuera.json` y con la ruta absoluta
de `fuera.json`. Ambas lecturas fueron aceptadas y devolvieron
`{"legado_cargados": 0, "legado_omitidos": 0}`. Se sustituyó el acceso a
tiendas por un mock; no hubo conexiones ni escrituras de prueba a la BD.

Esto confirma lectura local sin confinamiento, no explotación remota. La
revisión de referencias encontró la llamada desde el comando de siembra,
sin endpoint HTTP ni integración LLM que le proporcione la ruta. La
descripción HTTP/LLM del analizador no queda sustentada por ese recorrido.
El comando usa credenciales administrativas: conviene restringir su entrada
aunque el operador actual sea de confianza.

## Corrección

- `--desde-json` recibe solo un nombre `.json` de caracteres permitidos.
  Rechaza separadores, rutas absolutas y `..`.
- [archivos_legado.py](../backend/app/archivos_legado.py) fija la carpeta a
  `backend/datos_legado`, comprueba su ruta resuelta y que el destino sea
  un archivo regular dentro de ella. Rechaza enlaces simbólicos de carpeta
  y archivo y exige un objeto JSON como raíz.
- La lectura y validación ocurren antes de crear el engine de la siembra.
- [cargar_legado](../backend/app/seed.py) recibe datos ya cargados: ya no
  recibe una ruta ni abre archivos.
- Los comandos Docker montan la carpeta en `/app/datos_legado:ro`.

Cambio de uso: copiar el archivo a `backend/datos_legado` y pasar únicamente
su nombre, por ejemplo `python -m app.seed --desde-json legado_20261025.json`.
Las rutas arbitrarias antes aceptadas dejan de ser válidas. Los comandos
completos están en el [README](../README.md#base-de-datos-migraciones-siembra-y-datos-anteriores).

La carpeta debe seguir bajo control del operador. Esta validación no pretende
proteger contra un administrador local que pueda modificar el código o
reemplazar archivos entre comprobación y lectura. El montaje de solo lectura
impide cambios desde el contenedor, no desde el host. No se añade un endpoint
de importación ni se permite que usuarios de la tienda escriban en la carpeta.

## Verificación ejecutada

[10 pruebas aprobadas](../backend/tests/test_archivos_legado.py), ejecutadas
en un contenedor desechable con el código de trabajo montado en solo lectura:

```powershell
docker compose run --rm --no-deps -T -v "${PWD}/backend:/src:ro" -w /src backend python -m unittest discover -s tests -p test_archivos_legado.py -v
```

Cubren JSON válido con BOM, 14 variantes de nombres/rutas rechazadas antes
de leer, enlaces a archivos externos y carpetas, directorio con extensión
JSON, archivo ausente, JSON inválido, raíz no válida, rechazo CLI antes de
abrir el engine y conservación de nombre, precio y cantidad en una importación
válida con repositorios simulados. No se ejecutó la suite completa de BD.

`git diff --check` también pasó. No se silenció ninguna regla ni se añadió
una exclusión al analizador. Falta ejecutar nuevamente la herramienta que
emitió la alerta: estos resultados demuestran la restricción del acceso,
pero no garantizan que su análisis estático reconozca la validación. Si
persiste, revisar el nuevo recorrido y adjuntar esta evidencia antes de
clasificarla como falso positivo.
