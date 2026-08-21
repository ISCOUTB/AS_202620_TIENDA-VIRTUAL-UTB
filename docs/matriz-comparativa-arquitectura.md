# Matriz comparativa de estilos arquitectónicos

La comparación se realiza para la etapa actual de la Tienda Virtual UTB: un
equipo de cuatro personas, una primera versión académica, un único backend en
FastAPI y sin necesidad demostrada de despliegues independientes.

| Criterio | Arquitectura por capas | Arquitectura hexagonal | Monolito modular |
|---|---|---|---|
| Complejidad inicial | Baja: organización conocida y directa | Alta: requiere definir puertos, adaptadores y reglas de inversión de dependencias | Media: exige límites explícitos entre módulos, pero conserva un solo despliegue |
| Acoplamiento | Puede aumentar si las capas comparten modelos y servicios | Bajo entre dominio e infraestructura | Bajo entre funcionalidades si cada módulo conserva sus datos y contratos |
| Capacidad de prueba | Media: depende de que las capas no estén fuertemente acopladas | Alta: los puertos facilitan sustituir dependencias | Alta: los módulos pueden probarse de forma aislada y también como conjunto |
| Mantenibilidad | Adecuada al inicio, con riesgo de capas muy grandes | Alta, especialmente cuando existen varias integraciones | Alta para el alcance previsto si se hacen cumplir los límites modulares |
| Escalabilidad evolutiva | Permite crecer verticalmente, pero dificulta extraer funcionalidades acopladas | Facilita cambiar infraestructura, no implica por sí sola despliegues separados | Permite extraer un módulo futuro si aparece una necesidad real de despliegue independiente |
| Curva de aprendizaje | Baja | Alta | Media |
| Velocidad de montaje | Alta | Baja | Media-alta |
| Adecuación al proyecto | Aceptable, pero separa por aspectos técnicos y no por capacidades del negocio | Útil si aumentan las integraciones externas; excesiva para el esqueleto inicial | Alta: representa identidad, catálogo, inventario y pedidos sin introducir infraestructura distribuida |

## Resultado

Se selecciona el **monolito modular**. Esta alternativa permite comenzar con un
solo backend ejecutable y una sola base de datos, manteniendo límites explícitos
entre identidad, catálogo, inventario y pedidos. La decisión completa y sus
consecuencias se registran en
[`docs/adr/0001-monolito-modular.md`](adr/0001-monolito-modular.md).

Las tres alternativas no son necesariamente incompatibles en todos los
contextos. En futuras iteraciones, un módulo podría adoptar puertos y
adaptadores internamente si su complejidad o sus integraciones lo justifican.
