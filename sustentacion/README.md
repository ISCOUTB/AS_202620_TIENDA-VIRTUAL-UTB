# Carpeta de Sustentación — Tienda Virtual UTB

Bienvenido al repositorio documental y operativo de la **Sustentación Final de Arquitectura de Software** para la Tienda Virtual UTB.

Este espacio está diseñado para el equipo evaluador (**Profesor de la asignatura y jurados graduados**) y contiene la justificación, evidencia de código y trazabilidad directa de los **5 criterios de la rúbrica oficial (escala 0,00 – 5,00)** articulados en los **8 elementos arquitectónicos**.

---

## 🧭 Recursos Principales

- 🖥️ **Presentación Interactiva HTML (Taste-Skill):**  
  Abre [index.html](index.html) en cualquier navegador (funciona sin conexión ni dependencias externas; soporte de teclado con <kbd>←</kbd>, <kbd>→</kbd>, <kbd>M</kbd> y pantalla completa con <kbd>F</kbd>).
- 📋 **Matriz Espejo de Calificación:**  
  [EVALUACION-RUBRICA.md](EVALUACION-RUBRICA.md) detalla cada uno de los 5 criterios, el nivel propuesto (100%), puntaje sugerido y los archivos exactos que prueban el cumplimiento.
- 🗣️ **Guion de Exposición para el Equipo:**  
  [GUION-PRESENTACION.md](GUION-PRESENTACION.md) contiene la estructura de intervención (15–20 minutos), asignación de integrantes y el solucionario a las preguntas difíciles del tribunal.
- 🌐 **Sistema Desplegado en Producción:**  
  [https://tiendautb.iscoutb.dev/](https://tiendautb.iscoutb.dev/) (certificado SSL institucional Let's Encrypt).

---

## 🗺️ Mapa de los 8 Elementos de Arquitectura

Cada documento profundiza técnicamente en un elemento del sistema y referencia directamente las líneas de código, pruebas y ADRs asociados:

1. **[01-contexto-y-drivers.md](01-contexto-y-drivers.md):**  
   *Elemento 1:* Contexto del campus UTB, ficha del problema, árbol de utilidad ATAM y los 4 escenarios de calidad con umbrales medibles (Aporta a Criterio 1).
2. **[02-estilo-y-patron-monolito-modular.md](02-estilo-y-patron-monolito-modular.md):**  
   *Elemento 2:* Justificación del Monolito Modular vs Microservicios, Bounded Contexts y aislamiento verificado por AST en `test_architecture.py` (Aporta a Criterio 2 y 4).
3. **[03-vistas-arquitectonicas-c4-arc42.md](03-vistas-arquitectonicas-c4-arc42.md):**  
   *Elemento 3:* Vistas C4 (Contexto, Contenedor, Componentes) y correspondencia con las 12 secciones de arc42 (Aporta a Criterio 4).
4. **[04-tacticas-transacciones-y-consistencia.md](04-tacticas-transacciones-y-consistencia.md):**  
   *Elemento 4:* Transacción ACID compartida Pedidos–Inventario (ADR 0018), resiliencia, sondas de salud y worker de vencimiento `vencer_pedidos.py` (Aporta a Criterio 1 y 3).
5. **[05-seguridad-y-aislamiento-rls.md](05-seguridad-y-aislamiento-rls.md):**  
   *Elemento 5:* Defensa en profundidad, autenticación JWT HS256, roles y políticas nativas de PostgreSQL Row Level Security (ADR 0014) probadas en `test_rls.py` (Aporta a Criterio 3).
6. **[06-decisiones-adr-y-trade-offs.md](06-decisiones-adr-y-trade-offs.md):**  
   *Elemento 6:* Índice de 18 ADRs, análisis de alternativas descartadas y tabla de compromisos arquitectónicos (Aporta a Criterio 2).
7. **[07-validacion-empirica-y-pruebas.md](07-validacion-empirica-y-pruebas.md):**  
   *Elemento 7:* Medición empírica de concurrencia AC-04 (~42 ms de latencia, 0 errores), 119 pruebas E2E con TestSprite y contratos OpenAPI (Aporta a Criterio 3).
8. **[08-despliegue-riesgos-y-deuda-tecnica.md](08-despliegue-riesgos-y-deuda-tecnica.md):**  
   *Elemento 8:* Despliegue en Dokploy, pipeline de CI/CD en GitHub Actions y gestión honesta de deuda técnica bajo arc42 §11 (Aporta a Criterio 5).

---

## 📊 Matriz de Rúbrica Oficial (5,00 / 5,00)

| Criterio de Evaluación | Máximo | Nivel Sugerido | Puntaje | Evidencia Principal |
|---|:---:|:---:|:---:|---|
| **1. Sistema funcional y respuesta al desafío** | 1,25 | 100% | 1,25 | Despliegue en [tiendautb.iscoutb.dev](https://tiendautb.iscoutb.dev/), 5 tiendas operativas, flujo de reserva atómica y 119 pruebas E2E aprobadas. |
| **2. Decisiones y evolución** | 1,00 | 100% | 1,00 | 18 ADRs versionados, justificación de Monolito Modular vs Microservicios (ADR 0001, 0010) y evolución histórica S1–S16. |
| **3. Calidad, resiliencia y seguridad verificadas** | 1,00 | 100% | 1,00 | PostgreSQL RLS en migración 0002 (`test_rls.py`), medición empírica de concurrencia (~42 ms) y vencimiento automático de reservas. |
| **4. Coherencia y trazabilidad arquitectónica** | 0,75 | 100% | 0,75 | Vistas C4 Nivel 1 a 3, plantilla arc42 completa y límites de encapsulamiento validados estáticamente por AST en `test_architecture.py`. |
| **5. Demostración, sustentación y colaboración verificable** | 1,00 | 100% | 1,00 | Historial Git individual de 4 integrantes (Alejandro, Jasen, Levis, Shalom), revisión entre pares en `docs/revision-pares.md` y presentación interactiva. |
| **Total Propuesto** | **5,00** | **100%** | **5,00** | **Sustentación Completa de Arquitectura** |

---

## 🔑 Cuentas y Credenciales de Demostración

Para verificar los controles de acceso durante la sustentación:

| Rol | Identificador | Contraseña | Alcance Permitido |
|---|---|---|---|
| Comprador | `estudiante@utb.edu.co` | `demo123` | Explorar catálogo, agregar al carrito, reservar y consultar sus propios pedidos. |
| Admin Antojos | `antojos` | `demo123` | Administrar productos, existencias y atender cola únicamente de la tienda **Antojos**. |
| Admin Punto Fit | `puntofit` | `demo123` | Administrar únicamente la tienda **Punto Fit** (bloqueado de Antojos por RLS). |
| Admin Alegría | `alegria` | `demo123` | Administrar únicamente la tienda **Alegría**. |
| Supervisor General | `admin` | `demo123` | Modo supervisión (ADR 0017): lectura global de las 5 tiendas sin controles de edición. |
