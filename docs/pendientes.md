# Pendientes

Todo lo que queda abierto, en un solo sitio, con lo bloquea y quién lo
desbloquea. Los detalles de cada punto están en el documento enlazado; aquí solo
el estado y el siguiente paso.

**Última revisión: 2026-09-28.** Lo que sigue aparece disperso en al menos doce
ficheros de `docs/`. Este documento no sustituye a ninguno: los consolida.

---

## 1. Urgentes — seguridad

Ninguno de estos bloquea a los demás, y todos son independientes entre sí.

### 1.1 Rotar la contraseña del rol `neondb_owner`

**Estado:** la contraseña de producción está expuesta. Se compartió en un canal
de conversación el 2026-09-28 y no ha podido evitarse. Verificado que **no** está
en el repositorio ni en el historial de git.

Da acceso administrativo completo a la base de datos de producción.

Neon Console → proyecto `wandering-star-51602409` → reset de contraseña de
`neondb_owner`. **Después**, actualizar `DATABASE_URL` en las variables de
entorno del servicio de Render `srv-dasmvs0473hc73921aj0`.

> El orden importa. Si se resetea la contraseña y Render conserva la anterior en
> su configuración, la API se queda sin conexión. Una cosa y luego la otra.

Comprobar: `GET https://tienda-utb-api.onrender.com/health/ready` → 200.

### 1.2 Revocar o invalidar las claves de Neon Object Storage

**Estado:** expuestas en la misma conversación. Claves `nak_live_` / `nsk_live_`
apuntando a la rama `production`.

Dos salidas, y la segunda es la mejor:

- **Recomendada:** eliminar la rama `production` durante el corte de Terraform.
  Las claves mueren con ella y no hay que revocarlas a mano.
- Alternativa: revocarlas en Neon Console → Storage.

### 1.3 Eliminar el fichero local de credenciales

`/home/pxtron/Downloads/env` contiene esas mismas credenciales en texto plano,
fuera del repositorio y sin versionar. Con la rama destruida el primer valor
queda invalidado, pero el archivo no tiene razón para seguir existiendo.

### 1.4 Desambiguar los nombres `AWS_*`

**Estado:** pendiente, sin urgencia. Riesgo de confusión, no de seguridad.

`AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` en ese fichero **no son claves de
AWS**: son claves de Neon Object Storage, que reutilizan esos nombres porque el
cliente S3 se usa con un endpoint propio (`AWS_ENDPOINT_URL_S3`). Quien intente
rotarlas en el panel de AWS no las encontrará, y un escáner de secretos las
reportará como exposición de AWS. Renombrarlas a `NEON_STORAGE_*` evitará el
error, aunque entonces haya que ajustar quién las consume.

---

## 2. Migrar la infraestructura (ADR 0006)

**Estado:** la configuración está versionada, validada y commiteada. **No se ha
aplicado nada.** Producción sigue siendo la del 2026-09-27, verificada y
funcionando.

Procedimiento completo y en orden: [`despliegue-terraform.md`](despliegue-terraform.md).
Este es solo el índice.

| # | Paso | Bloqueado por |
|---|---|---|
| 2.1 | Crear `NEON_API_KEY`, `RENDER_API_KEY`, `VERCEL_API_TOKEN`, `GITHUB_TOKEN` | Cada persona, en su cuenta |
| 2.2 | Obtener `render_owner_id` (`usr-…` o `tea-…`) y ponerlo en `infra/terraform.tfvars` | Dashboard de Render |
| 2.3 | Confirmar la región del servicio existente; si no es `oregon`, declararla | API de Render |
| 2.4 | `terraform init` (hay que repetirlo si se reinicia la máquina: está en `/tmp`) | — |
| 2.5 | `terraform plan` — deben salir 4 recursos a crear y 0 a destruir | 2.1–2.4 |
| 2.6 | `apply` de Neon; verificar `connection_uri_pooler` y TLS | 2.5 |
| 2.7 | `apply` de Render; verificar `/health/ready` y `/catalog/products` | 2.6 |
| 2.8 | `apply` de Vercel; **desplegar con la CLI**, no se hace solo | 2.7 |
| 2.9 | `apply` de GitHub: variable y protección de rama | 2.5 |
| 2.10 | Corte: actualizar la URL de entrega y el keep-alive | 2.7–2.9 verificados |
| 2.11 | Destruir la infraestructura antigua **con la API de cada plataforma**, no con Terraform | 2.10 |
| 2.12 | Borrar `render.yaml`, `neon.ts`, `package.json` y `package-lock.json` raíz; quitar `.neon` del `.gitignore` | 2.11 |
| 2.13 | Purgar el estado de Terraform (`terraform destroy` con la config vacía, o borrar el fichero a mano) | 2.11 |

> **Ventana de coexistencia:** Render concede 750 h de instancia por espacio de
> trabajo y mes, no por servicio. Dos APIs en marcha un mes entero superarían el
> límite y Render suspendería **ambas**. Los pasos 2.6 a 2.11 tienen que ocupar
> **horas, no días**.

> **Piezas que Terraform no gestiona** y hay que resolver a mano, aunque no
> bloqueen: el despliegue a producción de Vercel (Hobby no conecta repos de
> organizaciones, así que lo dispara el pipeline o la CLI), el cron del
> keep-alive (no existe `github_actions_schedule`) y SonarCloud (no hay
> provider).

---

## 3. Pendientes del equipo, anteriores a esta migración

| # | Pendiente | Dónde | Nota |
|---|---|---|---|
| 3.1 | Crear `SONAR_TOKEN` | Secretos del repositorio | El job `sonarcloud` está condicionado a `if: env.SONAR_TOKEN != ''` y hoy no se ejecuta. Ojo: activarlo **exige** desactivar el Análisis Automático de SonarCloud, o el scan de CI falla por conflicto |
| 3.2 | Revisión y aprobación final del equipo | [`ia.md`](ia.md), filas de agosto | Varias filas del registro dicen literalmente «pendiente de completar por quien ejecutó la sesión» |
| 3.3 | Confirmar la consigna oficial y el contrato de evaluación | [`correcciones.md`](correcciones.md) | La discrepancia de rúbrica del corte 1 la resuelve el docente, no el equipo. Condiciona si hace falta SonarCloud y si las correcciones son exigibles |
| 3.4 | Registrar la prueba de carga concurrente (~5 sesiones) | [`aspectos.md`](aspectos.md) | El escenario 4 de disponibilidad declara «Cobertura parcial o pendiente, sin medición registrada». Es el hueco de evidencia más visible que queda |
| 3.5 | Enlazar `docs/correcciones.md` desde el índice del README | — | Se movió a `docs/` y ya se alcanza desde este documento, pero el índice de evidencias del README no lo enlaza. Decisión del equipo: mover sí, enlazar desde el README no |

---

## 4. Deuda técnica conocida

No urgente, pero registrada. Ninguna se ha approachable en esta iteración.

| # | Deuda | Dónde |
|---|---|---|
| 4.1 | El esquema se crea con `Base.metadata.create_all` en vez de migraciones | [`violaciones-s6.md`](violaciones-s6.md) V6 · arc42 §11 |
| 4.2 | Los límites entre módulos son una convención, no los impone la red | arc42 §11 · `test_architecture.py` |
| 4.3 | El rol `tienda_app` conserva `neon_superuser`, así que no es mínimo privilegio | [ADR 0006](adr/0006-infra-como-codigo-terraform.md) |
| 4.4 | Sin estado remoto de Terraform: dos `apply` simultáneos pueden pisarse | ADR 0006 |
| 4.5 | SonarCloud y las funciones de administración quedan fuera de la verificación automática | — |
| 4.6 | Los cuatro módulos `identity`, `inventory` y `orders` siguen vacíos | README |

---

## 5. Verificación del estado actual

Para comprobar que producción responde, sin necesidad de tokens:

```bash
API="https://tienda-utb-api.onrender.com"
WEB="https://tienda-virtual-utb-acme-8eed.vercel.app"

for p in /health /health/ready /catalog/products; do
  printf "%-18s HTTP %s\n" "$p" \
    "$(curl -s -o /dev/null -w '%{http_code}' --max-time 90 "$API$p")"
done

curl -s --max-time 90 "$WEB" -o /tmp/w.html -w 'web: HTTP %{http_code} en %{time_total}s\n'
grep -c "Café americano\|Empanada de queso\|Jugo de naranja\|Sándwich mixto" /tmp/w.html
```

Dos avisos que hacen perder tiempo si no se conocen:

- **`--max-time 90` es obligatorio.** Con el valor por defecto, `curl` corta
  antes de que Render salga de la suspensión y la comprobación falla sin que
  haya nada roto.
- **No se puede comprobar la autenticación buscando palabras.** Vercel sirve un
  `crossOrigin` en su payload y un patrón `sso` case-insensitive coincide
  dentro de «cr**ossO**rigin». Para saber si la URL es pública, mirar el código
  HTTP, no hacer grep.

**Último estado verificado (2026-09-28):** los cuatro endpoints responden 200,
los 4 productos llegan renderizados por SSR desde Vercel, 0 errores 5xx,
p50 0,85 ms en `/health`.
