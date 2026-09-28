# Correcciones solicitadas a la revisión del corte 1

Fecha de contraste local: 2026-09-07. Dirigido al agente revisor y al docente.

## Motivo de la solicitud

Solicitamos revisar la **aplicabilidad de la rúbrica utilizada** antes de mantener el subtotal técnico de **0,00 / 4,00**. Según la aclaración del equipo, el primer corte consolidaba las entregas **S1–S4** y no exigía resolver una restricción nueva de S5. La revisión recibida, titulada «semana-05-corte1», fundamenta sus ceros en la ausencia de ese reto nuevo.

Esta aclaración procede del equipo: la consigna oficial y el contrato de evaluación no se encontraron entre los archivos inspeccionados. Por tanto, la discrepancia de alcance debe resolverla el docente contrastando esos documentos. No presentamos como demostrado que la rúbrica sea incorrecta, pero sí solicitamos que se justifique su aplicación.

La revisión original reconoce la documentación base y el corte vertical S4. La objeción es que esos avances quedan excluidos del subtotal por no corresponder a un reto nuevo. **Si el alcance oficial era consolidar S1–S4, corresponde evaluar esas evidencias con sus criterios aplicables.**

## Estados y fechas de la evidencia

| Referencia | Estado comprobado y alcance |
|---|---|
| Revisión recibida | Preliminar del 2026-09-03 sobre `0d401a9a7691cb66b5174edc188ec2f21048aa2d`, fechado el 2026-09-01 a las 09:30:26 -05:00. |
| Cierre indicado en la revisión | `2026-09-07T05:00:00Z`, equivalente al 2026-09-07 a las 00:00 en Colombia. |
| HEAD local al preparar este documento | `20ab43f0df750705950895e0ee6e2a11fe3c95f9`, fechado el 2026-09-06 a las 07:56:34 -05:00, mensaje «Evidencia S6». |
| Diferencia posterior a la revisión | Documentación S6, enlaces desde README, nota en aspectos y una entrada de IA del 6 de septiembre. No incluye cambios de código. |

La fecha del commit S6 es anterior al cierre indicado, pero el historial local no demuestra cuándo se publicó en GitHub. Tampoco convierte la evidencia S6 en una respuesta al supuesto reto S5. Su incorporación exige actualizar la lectura del HEAD; no prueba un error histórico en la revisión del 3 de septiembre.

Los enlaces relativos siguientes permiten navegar los archivos actuales. Para comprobar su contenido en la revisión preliminar se utilizó el árbol de `0d401a9`; no deben atribuirse retrospectivamente sus adiciones posteriores a ese commit.

## Afirmaciones que requieren reconsideración o precisión

| Afirmación o criterio de la revisión | Evidencia del repositorio | Corrección solicitada y límite |
|---|---|---|
| Diagnóstico: «Sin evidencia evaluable del reto». | Ya existían la [ficha del problema](problema.md), los [escenarios de calidad](escenarios-calidad.md), el [árbol de utilidad](arbol-utilidad.md) y [arc42](arc42/arc42-template-EN.md). | Evaluar este diagnóstico si el corte consolidaba S1–S4. Estos documentos no demuestran un diagnóstico de una restricción nueva ni una línea base medida. |
| Alternativas y decisión: se descartan por ser anteriores a S5. | El [ADR 0001](adr/0001-monolito-modular.md) contiene contexto, alternativas, decisión y consecuencias; la [matriz comparativa](matriz-comparativa-arquitectura.md) compara estilos y escenarios. Ambos existían en el estado revisado. | Su antigüedad no los invalida para un corte acumulativo S1–S4. Es correcto que solo existe un ADR y que no se encontró otro dedicado a un reto nuevo. |
| Aplicación: «Sin ADR del reto no hay cambio que implementar». | Existían el [endpoint de catálogo](../backend/app/modules/catalog/router.py), la [persistencia](../backend/app/modules/catalog/repository.py), el [arranque y sembrado](../backend/app/main.py), la [vista web](../frontend/app/page.tsx) y [Compose](../compose.yaml). El [README](../README.md) documenta el recorrido y el arranque. | Reconocer la implementación del corte vertical al evaluar S1–S4. La ausencia de otro ADR no demuestra ausencia de implementación. Esta inspección no ejecutó el sistema completo ni acredita un cambio por una restricción nueva. |
| Límites conservados: «No cumple» porque no hay cambio del reto. | Existen reglas en el [ADR](adr/0001-monolito-modular.md), [C4 de contexto](c4/context.md), [C4 de contenedores](c4/container.md) y paquetes por módulo. | Evaluar la correspondencia de esos elementos con el alcance exigido. No declarar aislamiento demostrado: [test_architecture.py](../backend/tests/test_architecture.py) solo comprueba que los paquetes se pueden importar, no analiza dependencias indebidas. |
| Pruebas: se excluyen por corresponder a S4. | [test_catalog.py](../backend/tests/test_catalog.py) comprueba respuesta y datos del catálogo y su orden; [test_health.py](../backend/tests/test_health.py) comprueba salud y registro de ruta. El [workflow](../.github/workflows/tests.yml) ejecuta pytest. | Considerarlas para S4 si forma parte del corte. No prueban concurrencia, tiempo de actualización de inventario ni un reto nuevo. El run exitoso citado procede del informe recibido y no se verificó nuevamente. |
| Trazabilidad: «La cadena no es navegable en el formato de 8 columnas». | [Aspectos](aspectos.md) tenía seis columnas en `0d401a9`, cuatro filas de escenarios y enlaces a escenarios y ADR; también identifica ubicaciones de código y pruebas, varias como texto. Los [escenarios](escenarios-calidad.md) enlazan al ADR. | Distinguir trazabilidad existente pero incompleta de ausencia de trazabilidad. En ese estado faltaban columnas separadas de ID, C4 y Evidencia; se incorporan en esta corrección, sin efecto retroactivo; debe citarse la disposición oficial que exige el formato antes de concluir incumplimiento formal. |
| IA: ninguna entrada corresponde al reto del corte 1. | [El registro de IA](ia.md) ya contenía usos y revisiones S1–S4, incluidos descartes con motivos técnicos en entradas del 31 de agosto. | Evaluar esas entradas si el corte es acumulativo. Se reconoce que otras celdas tienen descartes sin declarar y que no existe una entrada identificada como resolución del reto S5. |
| Pipeline: falta SonarCloud y por ello «No cumple». | El [workflow](../.github/workflows/tests.yml) instala dependencias y ejecuta pytest; no se encontró configuración de SonarCloud en el repositorio. | Mantener la observación técnica y contrastar la obligatoriedad de SonarCloud para este corte con la consigna o el contrato. La ausencia de configuración local no demuestra por sí sola el estado de un servicio externo. |
| «0 de 12 criterios Cumple» y subtotal técnico 0,00 / 4,00. | El recuento corresponde a la matriz del reto; la propia matriz transversal reconoce varios cumplimientos y el informe acredita avances S4. | No extrapolar ese recuento a que todo el proyecto carece de valor evaluable. Revisar el subtotal una vez confirmado el alcance oficial, sin asignar aquí una nota sustituta. |

## Calificaciones cuestionadas y asuntos no revisados

Según el alcance S1–S4 confirmado por el equipo, se solicita **corregir como mal calificados por el agente** los criterios penalizados por exigir un reto nuevo o un ADR adicional no solicitado. La consigna oficial sigue pendiente de contraste por el docente; esta solicitud no inventa una calificación sustituta.

| Asunto | Estado solicitado | Aclaración y acción pendiente |
|---|---|---|
| Cobertura funcional del primer corte vertical | **No revisado en ejecución por el agente; funcionamiento confirmado por el equipo.** | El primer corte vertical de consulta del catálogo funciona según el equipo y su implementación está en el repositorio. Corresponde revisarlo ejecutando el recorrido web → API → base de datos. Los módulos futuros no justifican dar por incumplido el alcance del primer corte vertical. |
| Disponibilidad | **No revisada mediante ejecución del escenario.** | La inspección documental y las pruebas de contrato no comprueban la concurrencia. Corresponde ejecutar y registrar el escenario de unas cinco consultas simultáneas; la falta de esa comprobación no demuestra que el sistema falle. Tampoco se declara cumplido el umbral sin medirlo. |
| Reto S5 y ADR adicional | **No solicitado, según confirmación del equipo; calificación objetada.** | El corte consolidaba S1–S4 y no se solicitó un ADR adicional. Se pide retirar la penalización sustentada exclusivamente en su ausencia y evaluar el ADR 0001 y las alternativas existentes. El docente debe contrastar esta aclaración con la consigna oficial. |
| Línea base y comparación antes/después del reto | **Aplicabilidad cuestionada; medición no encontrada.** | No exigir una medición de un reto nuevo no solicitado según el equipo. Si existe un requisito de medición aplicable a S1–S4, debe identificarse y revisarse por separado. Los umbrales documentados no son resultados medidos. |
| Etiqueta `corte-1` | **Pendiente si la consigna la exige.** | No hay etiqueta local. Un commit con mensaje `corte-1` no equivale a una etiqueta ni subsana retroactivamente la entrega al cierre. |
| PDF y sustentación | **No verificados desde el repositorio.** | Corresponde al docente revisar Moodle y la sustentación. |

## Correcciones inmediatas y pendientes de reevaluación

- Se precisa que el funcionamiento del corte vertical está confirmado por el equipo y no fue revisado en ejecución en esta inspección.
- Se separa disponibilidad no medida de fallo demostrado y se registra que no se solicitó un ADR adicional, según el equipo.
- Se amplía la tabla de aspectos a ocho columnas con ID, C4 y evidencia; la prioridad se conserva dentro de cada aspecto. Esta mejora es posterior a la revisión y no invalida la observación histórica de las seis columnas.
- Se registra este uso de IA y sus límites técnicos. Los descartes históricos sin declarar deben completarlos sus responsables; no se inventan retrospectivamente.
- **Pendiente de corregir por el agente/docente:** las calificaciones basadas en el reto adicional objetado, el subtotal derivado de ellas y la evaluación del corte vertical y disponibilidad sin comprobación de ejecución.
- **Pendiente de información externa:** confirmar el contrato y, si exige SonarCloud, identificar su proyecto y credenciales para integrarlo. No se añade una configuración ficticia.

## Actualización requerida para evaluar el estado actual

El commit `20ab43f` añade el [mapa de contextos y dueños](bounded-contexts.md), el [análisis de violaciones y plan de corrección](violaciones-s6.md) y una entrada en [IA](ia.md) del 2026-09-06. Por ello, una nueva revisión no debe describir el HEAD actual como `0d401a9` ni afirmar que el registro actual de IA termina el 31 de agosto.

Estas adiciones documentan S6 y trabajo pendiente: no implementan las correcciones descritas. No deben utilizarse para afirmar que se resolvió un reto S5 o que se corrigieron las violaciones del código.

## Solicitud al agente revisor y al docente

1. Confirmar la consigna aplicable: consolidación S1–S4, como indica el equipo, o reto nuevo S5, como presupone la evaluación.
2. Citar la fuente de los requisitos de etiqueta, ocho columnas, SonarCloud y reto nuevo; la revisión indica que no recibió el apartado 11 del contrato aunque titula su matriz con esa referencia.
3. Si se confirma el alcance S1–S4, reevaluar diagnóstico, alternativas, decisión, corte vertical, pruebas y trazabilidad con la evidencia indicada, conservando los pendientes reales.
4. Emitir la evaluación definitiva distinguiendo estado preliminar, evidencia admisible al cierre, estado actual y elementos externos no verificados. La revisión original ya advertía que debía repetirse después del cierre.

## Método de comprobación

Se inspeccionaron archivos, el árbol histórico y las diferencias entre commits mediante comandos de solo lectura, entre ellos:

```bash
git show -s --format=fuller 0d401a9
git show -s --format=fuller 20ab43f
git ls-tree -r --name-only 0d401a9
git show 0d401a9:docs/aspectos.md
git show 0d401a9:.github/workflows/tests.yml
git diff 0d401a9 20ab43f --stat
git tag --list
```

No se ejecutaron pruebas de aplicación ni contenedores para esta revisión documental. No se consultaron Moodle, SonarCloud ni GitHub Actions. Se conservaron los cambios locales preexistentes; esta corrección añade `correcciones.md`, completa la tabla de aspectos y registra el uso de IA. El commit solicitado se identifica con el mensaje `corte-1`; no constituye una etiqueta ni una entrega retroactiva.
