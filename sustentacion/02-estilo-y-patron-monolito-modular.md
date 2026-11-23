# Elemento 2: Estilo y Patrón Arquitectónico (Monolito Modular vs Microservicios)

> **Alineación con la Rúbrica Oficial:** Sustenta el **Criterio 2 (Decisiones y evolución — 1,00 pts)** y el **Criterio 4 (Coherencia y trazabilidad — 0,75 pts)** al demostrar madurez de diseño al rechazar la distribución innecesaria y garantizar límites de dominio reales en el código.

---

## 1. Justificación de la Elección: Monolito Modular (ADR 0001 y ADR 0010)

Una de las preguntas más frecuentes que formulan los evaluadores recién graduados es: *«¿Por qué no usaron microservicios con Docker para cada módulo?»*.

Nuestra respuesta se fundamenta en principios sólidos de ingeniería de software:

### 1. La Ley de Conway y el Tamaño del Equipo
La Ley de Conway establece que la estructura de un sistema de software refleja la estructura de comunicación de la organización que lo diseña. Un equipo de **4 desarrolladores** para un alcance de 5 tiendas en un campus universitario no tiene la capacidad de operar, monitorear, depurar y desplegar 4 o 5 servicios independientes sin sacrificar la calidad del producto.

### 2. Las Falacias de la Computación Distribuida
Separar Catálogo, Inventario, Pedidos e Identidad en servicios de red distintos introduce de inmediato:
- **Latencia de red y serialización JSON:** Un checkout requeriría múltiples llamadas HTTP encadenadas.
- **Fallos parciales:** ¿Qué ocurre si el servicio de Pedidos responde pero el de Inventario cae a mitad de la operación? Exigiría implementar patrones complejos como Saga, Outbox Pattern y colas de reintentos (Dead Letter Queues).
- **Consistencia eventual no deseada:** En una cafetería con alta concurrencia, una inconsistencia de pocos segundos causa sobreventa de productos.

### 3. La Decisión Formal (ADR 0001 y ADR 0010)
Decidimos construir un **Monolito Modular**: un único proceso en tiempo de ejecución (FastAPI + PostgreSQL) con **estricta separación lógica de paquetes y contratos explícitos en tiempo de desarrollo**. Si en el futuro el volumen del campus justificara escalar solo el módulo de catálogo, los límites ya están trazados para extraerlo sin reescribir la lógica.

---

## 2. Delimitación de Contextos (Bounded Contexts)

Siguiendo los principios de **Domain-Driven Design (DDD)**, el backend se organiza en 4 dominios claramente diferenciados más un paquete transversal:

```
backend/app/
├── modules/
│   ├── identity/    # Contexto: Autenticación, JWT, usuarios y roles por tienda
│   ├── catalog/     # Contexto: Tiendas, productos, presentaciones y precios
│   ├── inventory/   # Contexto: Existencias físicas, bloqueos y movimientos
│   └── orders/      # Contexto: Carrito, pedidos, estados de cola y totales
└── shared/          # Transversal: Base de datos, seguridad RLS, métricas y logs
```

### Reglas de Interacción entre Módulos
1. Ningún módulo puede acceder a las tablas o modelos SQLAlchemy privados de otro módulo.
2. La comunicación entre módulos se realiza **exclusivamente a través de contratos públicos formalizados en archivos `public.py`** o en el inicializador del paquete.
3. Si el módulo de Pedidos necesita verificar existencias, no ejecuta `SELECT` sobre las tablas de inventario: invoca la función pública `descontar_existencias_reserva()` del contrato de inventario.

---

## 3. Barrera Arquitectónica en Código: Verificación Estática con AST

Para evitar que los límites arquitectónicos sean simples «buenas intenciones» que se degradan con el tiempo, implementamos una prueba automatizada basada en el árbol de sintaxis abstracta (**Abstract Syntax Tree — AST**):

📄 **Archivo:** `backend/tests/test_architecture.py`

```python
def test_modules_do_not_import_other_modules_internals() -> None:
    """Permite APIs de paquete y contratos `public`; rechaza detalles internos."""
    violations: list[str] = []
    for owner in MODULES:
        for source in (MODULES_ROOT / owner).rglob("*.py"):
            tree = ast.parse(source.read_text(encoding="utf-8"), filename=str(source))
            for imported, imported_names in _imports(tree, f"app.modules.{owner}"):
                prefix = "app.modules."
                if not imported.startswith(prefix):
                    continue
                parts = imported.split(".")
                target = parts[2] if len(parts) > 2 else ""
                is_public_contract = (
                    len(parts) == 3
                    and bool(imported_names)
                    and set(imported_names) <= {"initialize", "router"}
                ) or (len(parts) == 4 and parts[3] == "public")
                if target and target != owner and not is_public_contract:
                    violations.append(f"{source.relative_to(MODULES_ROOT)} -> {imported}")

    assert not violations, "Imports cruzados de internos:\n" + "\n".join(violations)
```

### Impacto de Esta Prueba en CI
Si un desarrollador introduce un acoplamiento indebido (por ejemplo, importando `from app.modules.inventory.models import Existencia` dentro de `orders`), la suite de pruebas en GitHub Actions **falla de inmediato**, bloqueando la fusión del Pull Request.

---

## 4. Comparativa de Trade-offs: Monolito Modular vs Microservicios

| Dimensión | Monolito Modular (Elegido) | Microservicios (Descartado) | Justificación de la Elección |
|---|---|---|---|
| **Latencia de Checkout** | En memoria / llamada interna (< 1 ms). | Múltiples saltos HTTP (30–100 ms). | Máxima velocidad en horas pico. |
| **Garantía Transaccional** | ACID atómica en PostgreSQL. | Consistencia eventual (Sagas/2PC). | Elimina por diseño la sobreventa de productos. |
| **Complejidad de Despliegue** | 1 contenedor API en Dokploy. | 4 contenedores + Service Mesh / Proxy. | Despliegue reproducible sin costo operativo. |
| **Sobrecarga de Red** | Cero tráfico interno. | Serialización/deserialización JSON constante. | Ahorro de CPU y memoria en el servidor. |
| **Escalabilidad Independiente** | Todo el backend escala junto. | Cada servicio escala por separado. | En la escala del campus (5 tiendas), un contenedor soporta con holgura la carga. |
