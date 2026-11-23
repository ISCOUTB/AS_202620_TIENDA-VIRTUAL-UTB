# Guion de Sustentación — Tienda Virtual UTB (15 a 20 Minutos)

Este guion organiza la intervención del equipo (**Alejandro Patron, Jasen Yukopila, Levis Ortiz y Shalom Arrieta**) para defender la arquitectura del proyecto ante el **Profesor de la asignatura y los jurados evaluadores**.

---

## ⏱️ Estructura Temporal y Distribución de Roles

| Tiempo | Bloque de la Exposición | Criterio de Rúbrica Asociado | Responsable Sugerido |
|:---:|---|---|---|
| **00:00 – 03:00** | **Apertura:** Contexto del Campus, Problema y Drivers de Calidad (Árbol ATAM) | Criterio 1 (Sistema Funcional) | **Alejandro Patron** |
| **03:00 – 07:00** | **El Núcleo:** Monolito Modular, C4 interactivo, Bounded Contexts y barrera AST | Criterio 2 y 4 (Decisiones y Trazabilidad) | **Jasen Yukopila** |
| **07:00 – 11:00** | **Tácticas Críticas:** Transacción Compartida ACID vs Saga y PostgreSQL RLS | Criterio 1 y 3 (Calidad y Seguridad) | **Levis Ortiz** |
| **11:00 – 14:00** | **Demostración Técnica y Frontend:** Despliegue en vivo, UI/UX, vitrinas y prueba de roles | Criterio 1 y 5 (Demostración y Operación) | **Shalom Arrieta** |
| **14:00 – 17:00** | **Evidencia Empírica y Deuda:** Medición de concurrencia y arc42 §11 | Criterio 3 y 5 (Resiliencia y Deuda) | **Alejandro Patron** |
| **17:00 – 20:00** | **Defensa ante el Tribunal:** Respuestas a preguntas del jurado | Criterio 5 (Sustentación) | **Todo el equipo** |

---

## 🎤 Guion Minuto a Minuto

### 1. Apertura: El Problema Real y Drivers de Calidad (00:00 – 03:00)
- **Ponente:** Alejandro Patron.
- **Diapositivas de apoyo:** Portada y Diapositiva 1 de `sustentacion/index.html`.
- **Línea argumental:**
  > *"Buenos días, profesor y jurados evaluadores. Hoy presentamos la arquitectura de la Tienda Virtual UTB. Nuestro enfoque no es mostrar pantallas aisladas, sino explicar cómo diseñamos una arquitectura para resolver los problemas reales de las 5 cafeterías del campus de la UTB.*
  > 
  > *Las cafeterías tienen aglomeraciones críticas en descansos y almuerzos, cobran directamente en el mostrador y manejan inventarios cambiantes. Usando el método ATAM priorizamos 4 Atributos de Calidad: Seguridad (AC-01) con aislamiento estricto por tienda; Usabilidad (AC-02) completando pedidos en 4 pasos; Rendimiento (AC-03) con stock actualizado en menos de 2 segundos; y Disponibilidad (AC-04) soportando la hora pico sin caídas."*

---

### 2. El Núcleo: Monolito Modular y Vistas C4 Interactivas (03:00 – 07:00)
- **Ponente:** Jasen Yukopila.
- **Diapositivas de apoyo:** Diapositivas 2 y 3 de `sustentacion/index.html`.
- **Línea argumental:**
  > *"¿Por qué no usamos microservicios? Por la Ley de Conway y para no complicar el sistema sin necesidad. Separar cuatro servicios de red para un equipo de cuatro personas habría sumado latencia de red, serialización JSON y problemas de consistencia eventual.*
  > 
  > *Elegimos un Monolito Modular (ADR 0001 y 0010). Tenemos cuatro módulos bien delimitados: identity, catalog, inventory y orders. En la diapositiva 3 pueden ver el explorador interactivo C4: Nivel 1 de contexto, Nivel 2 de contenedores en Dokploy y Nivel 3 de componentes internos.*
  > 
  > *Y los límites no son solo teoría: creamos una prueba con el AST de Python en `test_architecture.py`. Si un módulo intenta importar clases privadas de otro en lugar de usar su contrato público, la prueba falla en el pipeline de GitHub Actions."*

---

### 3. Tácticas Críticas: Transacción ACID y PostgreSQL RLS (07:00 – 11:00)
- **Ponente:** Levis Ortiz.
- **Diapositivas de apoyo:** Diapositivas 4 y 5 de `sustentacion/index.html`.
- **Línea argumental:**
  > *"En el núcleo transaccional resolvimos el riesgo de sobreventa. Con el ADR 0018, la creación del pedido y el descuento de existencias ocurren en la misma transacción SQL local con bloqueo pesimista `SELECT ... FOR UPDATE`. Como pueden ver en el simulador interactivo de la diapositiva 4, si dos personas piden la última unidad a la vez, una gana el lock y a la otra se le cancela la operación de inmediato con rollback limpio.*
  > 
  > *Además, con el ADR 0014 no confiamos la seguridad a un filtro en Python. Activamos Row Level Security en PostgreSQL 17. Como ven en el simulador de la diapositiva 5, si una sesión pertenece a Antojos, el propio motor de base de datos le bloquea las filas de Punto Fit, garantizando privacidad total entre concesionarios."*

---

### 4. Demostración en Vivo, UI de Frontend y Roles (11:00 – 14:00)
- **Ponente:** Shalom Arrieta.
- **Pantalla:** Navegador abierto en [https://tiendautb.iscoutb.dev/](https://tiendautb.iscoutb.dev/).
- **Acciones a ejecutar:**
  1. Mostrar el diseño de la web basado en la filosofía de vidrio y las vitrinas de productos de las 5 tiendas.
  2. Iniciar sesión como comprador (`estudiante@utb.edu.co`), agregar un producto y reservar seleccionando hora de recogida. Mostrar la actualización del stock.
  3. Iniciar sesión como administrador de `antojos` y mostrar su cola de pedidos activa.
  4. Demostrar el rechazo: intentar consultar pedidos de otra tienda y evidenciar el error HTTP 403 Forbidden.
  5. Iniciar sesión como `admin` general y mostrar el Modo Supervisión (ADR 0017): puede auditar todas las tiendas pero los controles de edición están deshabilitados.

---

### 5. Evidencia Empírica, Deuda Técnica y Equipo (14:00 – 17:00)
- **Ponente:** Alejandro Patron.
- **Diapositivas de apoyo:** Diapositivas 6, 7 y 8 de `sustentacion/index.html`.
- **Línea argumental:**
  > *"Para respaldar la disponibilidad, medimos formalmente la concurrencia con `measure_catalog_availability.py`. Corrimos 6 pruebas con 5 usuarios simultáneos: las 30 cargas fueron exitosas con cero errores y una latencia promedio de 32,8 ms.*
  > 
  > *En la diapositiva 8 mostramos nuestro despliegue en Dokploy bajo el dominio institucional `tiendautb.iscoutb.dev` y gestionamos la deuda técnica en arc42 §11: lo resuelto (Alembic y RLS), lo asumido (un solo host Dokploy y medición en loopback) y lo pendiente.*
  > 
  > *El trabajo se dividió por áreas claras: Alejandro en Backend y RLS; Jasen en arquitectura de Frontend SSR y sistema de diseño; Levis en Pedidos y colas; y Shalom en componentes de UI, vitrinas, pruebas automatizadas y revisión de pares."*

---

## 🛡️ Respuestas Claras a Preguntas Frecuentes del Jurado

### Pregunta 1: "¿Por qué no usaron eventos asíncronos con RabbitMQ o Kafka?"
> **Respuesta:** *"Porque habría sido sobreingeniería innecesaria. Un broker de eventos introduce consistencia eventual, retrasos en la actualización del stock y exige mantener otro cluster. Para cinco tiendas en un campus, una transacción local en PostgreSQL con `FOR UPDATE` garantiza consistencia inmediata y cero sobreventa a costo operativo cero."*

### Pregunta 2: "¿Qué pasa si se cae el servidor de Dokploy?"
> **Respuesta:** *"Lo reconocemos en la Sección 11 de arc42 como deuda técnica asumida. Operamos sobre una sola máquina virtual. Para proteger los datos, el volumen de PostgreSQL es persistente (`tienda_pgdata`) y el archivo Compose permite recrear todo en minutos. Un clúster multi-nodo no se justificaba por presupuesto para esta etapa."*

### Pregunta 3: "¿Cómo evitan que una reserva abandonada bloquee el inventario?"
> **Respuesta:** *"Con el comando `vencer_pedidos.py`. Revisa las reservas en estado pendiente de pago que lleven más de 24 horas, las cancela de forma automática y le devuelve las existencias al inventario de la tienda."*

### Pregunta 4: "¿Por qué el administrador general no puede cambiar precios si es el jefe?"
> **Respuesta:** *"Por el ADR 0017. Cada cafetería es un negocio privado con sus propios contratos. Si un funcionario de la universidad pudiera cambiar precios o existencias desde su panel, causaría problemas comerciales. Su rol es supervisar métricas y tiempos de atención, no administrar el negocio ajeno."*
