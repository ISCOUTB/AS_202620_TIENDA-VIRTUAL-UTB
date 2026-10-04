# ADR 0006: Infraestructura como código con Terraform

- **Estado:** Sustituida sin haberse aplicado. El [ADR 0007](0007-despliegue-dokploy.md)
  reemplazó esta propuesta el 2026-10-04; se conserva como registro histórico.
- **Fecha:** 2026-09-28
- **Relacionada:** [ADR 0003](0003-frontend-vercel.md) (Vercel),
  [ADR 0004](0004-api-contenedor-render.md) (Render) y
  [ADR 0005](0005-postgres-neon.md) (Neon). Esta decisión sustituye la forma en
  que los tres se declaraban, no las plataformas elegidas.

## Contexto

Después del despliegue del 2026-09-27 (ADR 0003-0005), la configuración de la
infraestructura estaba repartida en cinco sitios que nadie podía ver a la vez:

| Dónde | Qué contenía |
|---|---|
| `render.yaml` | El blueprint de la API. **No llegó a usarse para crearla**: el servicio se creó mediante la API de Render, así que el archivo describía algo que nunca existió como tal |
| `neon.ts` | La política de ramas y el bucket `media`, con la CLI de Neon |
| `frontend/vercel.json` | Tres líneas: `{"framework": "nextjs"}` |
| Paneles de Render, Vercel y Neon | El estado real: dominio de la API, `DATABASE_URL`, `API_URL`, región, plan |
| `.env` local de cada persona | Las credenciales, copiadas a mano |

El resultado era que tres cosas estaban garantizadas sólo por disciplina y no
por el repositorio: que la URL de la base de datos apuntara a la base correcta,
que el cliente apuntara a la API correcta, y que nadie introdujera un secreto en
un archivo versionado. Las dos primeras ya habían exigido copiar y pegar
cifras largas entre consolas —`DATABASE_URL` contiene la contraseña de Neon, y
`API_URL` solo funciona si coincide con el subdominio que Render asignó— y la
tercera la sostenía una regla acordada, no una barrera.

Dos pasos del procedimiento documentado estaban además pendientes de más de
una semana por la misma razón: la protección de la rama `main` y la conexión de
Vercel con GitHub, ambos porque son configuración de plataforma y no archivos.

## Alternativas consideradas

### Qué herramienta

| Alternativa | Ventajas | Costos y adecuación |
|---|---|---|
| **Terraform** | Proveedor **oficial de Render** con import por ID de servicio; proveedores mantenidos para Neon, Vercel y GitHub; estado explícito y revisable; estándar del sector | Cuatro proveedores que mantener; el estado contiene secretos, y sin backend remoto no hay bloqueo entre compañeros |
| OpenTofu | Fork más rápido, CLI compatible, sin licencia de BSL | No añade nada a este caso; cambiar después de escribir los `.tf` es trabajo tira |
| Pulumi | HCL como código en un lenguaje general; más agradable para quien no conoce HCL | Otra toolchain y otro concepto nuevo; los proveedores de menor alcance son un problema conocido |
| Continuar con `render.yaml` + `neon.ts` + paneles | Coste cero, ya funciona | Es exactamente el problema: el estado real no está en el repositorio y dos pasos quedaron sin hacer |
| Terraform en un subdirectorio de `infra/` por proveedor | Orden temático en el árbol | Los ficheros `.tf` de un subdirectorio no se cargan sin un `module`; obligaría a convertir cada proveedor en módulo con su bloque de variables, para cuatro recursos |

### Cómo incorporar lo que ya funciona

| Alternativa | Ventajas | Costos y adecuación |
|---|---|---|
| **Recrear en paralelo y cortar después** | Demuestra que la infraestructura es reconstruible desde el repositorio, que es parte de lo que el entregable afirma | Hay que rehacer la URL de entrega y vigilar las horas gratuitas de Render |
| `terraform import` de lo existente | No cambia nada; es lo que recomienda el provider de Render | Un estado importado a mano demuestra que alguien escribió a mano el estado que la plataforma ya tenía: no prueba nada sobre la reproducibilidad |

### Dónde vive el estado

| Alternativa | Ventajas | Costos y adecuación |
|---|---|---|
| **Local, en `.gitignore`** | Cero cuentas nuevas, coherente con haber descartado UptimeRobot por eso; el estado nunca sale del equipo | Sin bloqueo entre compañeros; el fichero con la contraseña vive en el disco de cada uno |
| Terraform Cloud (capa gratuita) | Estado remoto cifrado, bloqueo, variables sensibles, plan en el PR | Cada miembro del equipo necesita una cuenta más, que es la fricción que el equipo ya decidió evitar |
| Estado versionado y cifrado con SOPS/age | Estado compartido sin salir del repositorio | Una dependencia de cifrado que mantener para un proyecto de cuatro recursos |
| Estado versionado en claro | Máxima reproducibilidad | **Descartada.** Contradice el invariante de "secretos nunca en el repo" que el proyecto lleva sosteniendo desde S8 |

## Decisión

La infraestructura de producción se declara con **Terraform 1.16** en `infra/`,
usando cuatro proveedores: `kislerdm/neon`, `render-oss/render`, `vercel/vercel` e
`integrations/github`. Se **recrea en paralelo** y se corta cuando la nueva esté
verificada. El estado es **local y git-ignorado**.

Cuatro decisiones dentro de esa que merecen justificación aparte:

**Los recursos nuevos llevan sufijo `-tf` mientras coexisten.** `tienda-utb-tf`,
`tienda-utb-api-tf`, `tienda-virtual-utb-tf`. No es decoración: durante la
convivencia, dos recursos con el mismo nombre en la misma plataforma son
indistinguibles al leer un log, una factura o un output. Con el nombre del stack
en producción, el output `web_url` devolvería la URL de la web antigua y la
verificación posterior "pasaría" mirando la infraestructura equivocada. En el
corte definitivo se quitan los tres sufijos y se vuelve a aplicar.

**El proyecto de Neon se declara con un único recurso.** Su bloque `branch` crea
la rama, el rol y la base a la vez, que es lo que hace el propio proyecto al
aprovisionarse. Declararlos además como `neon_branch`, `neon_role` y
`neon_database` chocaría con ese bloque: la rama por defecto solo puede existir
una vez y solo admite un endpoint `read_write`.

**La API deja de usar `neondb_owner`.** Render recibía el `DATABASE_URL` de
`neondb_owner`, el rol que Neon crea con privilegios plenos y miembro de
`neon_superuser`, con la contraseña copiada a mano entre consolas. Ahora el rol
se llama `tienda_app` y su contraseña la genera el provider: no está escrita en
ningún archivo, y deja de haber una credencial con nombre genérico de
administración del proyecto en producción.

> **Lo que esto NO es.** No es mínimo privilegio, y conviene no venderlo como
> tal. Según la documentación de Neon, «the default role created with your Neon
> project» recibe la pertenencia a `neon_superuser`, y eso sigue siendo cierto
> aunque se le ponga otro nombre con `branch.role_name`. Así que `tienda_app`
> sigue pudiendo crear roles y bases de datos dentro de su rama. Lo que sí gana
> es identidad —un rol con nombre y una contraseña que nadie teclea— no
> autorización. Un rol de mínimo privilegio real exigiría un recurso
> `neon_role` con concessions SQL explícitas y quitarle `neon_superuser`, que el
> provider no expresa y que Terraform no puede ejecutar sin un `local-exec` a un
> `psql`; queda fuera de alcance y anotado como deuda.

**No se declara la conexión de Vercel con GitHub.** El provider la soporta
(`git_repository`), pero el plan Hobby de Vercel no conecta proyectos con
repositorios de una **organización** de GitHub, y este repositorio está en
`ISCOUTB`. Declararlo haría fallar el `apply`. Esto explica el "pendiente" de
`docs/despliegue-s8.md` y lo sustituye: el despliegue a producción lo dispara el
pipeline, y Terraform gobierna el proyecto y su configuración.

## Consecuencias

**A favor**

- La URL de la base, la de la API y la del keep-alive son ahora **referencias
  entre recursos**. Si Render cambia el dominio, el cliente web y el keep-alive
  se actualizan en el mismo `apply`. Es la mitad de los pasos manuales que
  quedan.
- La protección de `main` deja de ser un paso pendiente: pasa a ser un recurso.
  Exige el check `backend`, que es el nombre del job en `tests.yml` y siempre
  reporta. Los checks exigidos están en la variable
  `github_required_status_checks` porque exigir uno que nadie emite bloquearía
  los merges de forma indefinida y sin explicar por qué: `SonarCloud Code
  Analysis` no es el nombre de ningún job, lo crea la app de SonarCloud, y el
  job `sonarcloud` va condicionado a `if: env.SONAR_TOKEN != ''`, así que
  mientras no exista ese secreto no se emite. Ampliar la lista cuando
  SonarCloud esté montado es cambiar un valor.
- `render.yaml` deja de describir un servicio que nunca se creó con él, y
  `neon.ts` deja de ser la fuente de verdad de la base de datos.
- Un `plan` muestra el cambio antes de aplicarlo, que es justo lo que faltaba
  cuando un despliegue de GitHub a Render salía mal y había que buscarlo en el
  panel.

**En contra**

- **El estado contiene la contraseña de la base de datos en claro.** Es
  inevitable: la genera el provider y tiene que guardarla en algún sitio. Por
  eso `terraform.tfstate*` está ignorado de forma explícita y anotada, no por un
  patrón genérico. El fichero es ahora lo más sensible del repositorio.
- **No hay bloqueo entre compañeros.** Dos `apply` simultáneos pueden pisarse.
  Con cuatro recursos y cambios poco frecuentes es asumible; no lo sería al
  crecer.
- **No se puede ejecutar `plan` en CI** sin estado compartido, y hacerlo exigiría
  publicar los cuatro tokens como secretos del repositorio. El workflow se
  limita a `fmt`, `validate` y `tflint`.
- **Se añade una toolchain** que el equipo tiene que aprender y mantener, y una
  dependencia más en el camino de despliegue.

**Lo que sigue igual o empeora**

- El **cron del keep-alive** no se puede mover a Terraform: el provider de
  GitHub no tiene recurso para programar workflows. Sigue en el YAML versionado.
- **SonarCloud** sigue fuera: la organización, el proyecto y el Quality Gate no
  tienen provider, y el proyecto está en modo de análisis automático.
- El **bucket de Neon Object Storage** se eliminó. Estaba declarado, vacío y sin
  código que lo usara, y declararlo obligaba a mantener `neon.ts` y el
  `package.json` raíz fuera de Terraform. Volver a declararlo, cuando haya
  imágenes que subir, significa salir de Terraform otra vez.

**Deuda que esta decisión deja o agrava**

- **El rol de la aplicación no es de mínimo privilegio.** `tienda_app` sigue
  siendo miembro de `neon_superuser` y puede crear roles y bases de datos
  dentro de su rama. Hoy da igual, porque la API solo hace `SELECT` sobre un
  catálogo, pero si algún día se activan RLS o se conectan más consumidores, el
  rol hay que rehacerlo con concessions SQL explícitas. Ver la nota del punto
  anterior de esta sección.
- `docs/violaciones-s6.md` (V6) y §11 de arc42 señalan que el esquema se crea con
  `Base.metadata.create_all` en vez de migraciones. Sigue siendo así, y es lo que
  permite que esta migración no necesite mover datos: el backend reconstruye la
  base solo al arrancar. Es también lo que la hace frágil ante cambios de
  esquema destructivos, y sigue pendiente de su propio ADR.
- **Sin estado remoto**, dos personas aplicando a la vez pueden pisarse. Volver
  atrás es un `backend "local"` → `backend "remote"` más mover el fichero.
