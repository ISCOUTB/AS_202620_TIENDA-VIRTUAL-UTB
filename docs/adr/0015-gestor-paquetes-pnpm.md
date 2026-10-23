# ADR 0015: pnpm como gestor de paquetes del frontend, en lugar de npm

- **Estado:** Propuesta — pendiente de ratificación del equipo
- **Fecha:** 2026-10-22
- **Relacionada:** [ADR 0007](0007-despliegue-dokploy.md) (la imagen del
  frontend se construye en Dokploy) y el job `frontend` de
  [`.github/workflows/tests.yml`](../../.github/workflows/tests.yml).

## Contexto

El frontend (Next.js 15, Tailwind v4, Vitest, ESLint) se instalaba con npm:
`npm ci --ignore-scripts` en CI y en el `Dockerfile`, con `package-lock.json`
como lockfile. El rediseño añadió dependencias nuevas (`gsap`,
`@gsap/react`) y el árbol de `node_modules` siguió creciendo en cada máquina,
en el runner y en cada build de la imagen.

npm aplana las dependencias en `node_modules`: cualquier paquete transitivo
queda importable desde el código propio aunque no esté declarado en
`package.json`. Así el proyecto funcionaba con `eslint` —que solo llegaba como
dependencia *peer* de `eslint-config-next`— sin declararlo, y un cambio en la
versión de un paquete ajeno podía romper el build sin tocar `package.json`.

## Alternativas consideradas

1. **Mantener npm.** Sin coste de migración, pero conserva las dependencias
   fantasma y las instalaciones completas en cada entorno. Rechazada.
2. **Yarn (Berry, Plug'n'Play).** Resolución estricta, pero PnP exige
   adaptaciones en Next.js, ESLint y el editor, y el modo `node_modules`
   pierde la ventaja. Rechazada por el coste de integración.
3. **pnpm con el `node_modules` aislado por defecto.** Almacén global
   direccionado por contenido y enlaces simbólicos por paquete. Seleccionada.

## Decisión

- El frontend usa **pnpm 9.15.0**, fijado en `packageManager` de
  `frontend/package.json` y activado con **Corepack** (incluido en Node 22).
- El lockfile es `frontend/pnpm-lock.yaml`; `package-lock.json` se elimina.
- CI usa `pnpm/action-setup@v4` (versión leída de `packageManager`) y
  `actions/setup-node` con `cache: pnpm`; el `Dockerfile` activa la misma
  versión con `corepack prepare`.
- Se instala siempre con `pnpm install --frozen-lockfile --ignore-scripts`:
  se mantiene la política de no ejecutar scripts de instalación de terceros
  (SonarQube S6505).
- Sin `.npmrc`: se conserva el modo estricto por defecto. Las dependencias
  que antes llegaban solo por elevación se declaran en `package.json`
  (`eslint`). Los *plugins* de ESLint que carga `eslint-config-next` quedan
  cubiertos por el `public-hoist-pattern` por defecto de pnpm 9
  (`*eslint*`, `*prettier*`).

## Consecuencias

**Positivas**

- Instalaciones más rápidas y con menos disco: cada versión de un paquete se
  guarda una vez en el almacén y se enlaza en cada proyecto.
- Resolución estricta: el código solo puede importar lo que declara
  `package.json`; las dependencias fantasma fallan en local y en CI, no en
  producción.
- La versión del gestor queda fijada en el repositorio, igual en todas las
  máquinas, en CI y en la imagen.

**Negativas y riesgos**

- Cada integrante debe activar Corepack (`corepack enable`) una vez; en
  Windows puede requerir una consola con permisos de administrador.
- La versión de pnpm aparece en dos sitios (`packageManager` y el
  `ARG PNPM_VERSION` del `Dockerfile`) y deben actualizarse juntas.
- pnpm 10 vacía el `public-hoist-pattern` por defecto y bloquea los scripts
  de instalación: subir de versión exige revisar ESLint y este ADR.

## Condiciones de reapertura

Este ADR se revisa cuando:

1. Se actualice pnpm a una versión mayor (10 o posterior).
2. Una dependencia necesite elevación (`shamefully-hoist` o
   `public-hoist-pattern`) o scripts de instalación para funcionar.
3. El repositorio pase a ser un monorepo con varios paquetes JavaScript: se
   valoraría un `pnpm-workspace.yaml` en la raíz.
