// SUSTITUIDO — no ejecutar `neon deploy`.
//
// La base de datos se gestiona ahora con Terraform en `infra/neon-project.tf`.
// Este archivo queda solo con el bucket de Neon Object Storage, que el provider
// de Terraform no puede expresar: `POST /projects/{id}/branches/{id}/buckets` es
// la única vía, y el bucket `media` que declaraba estaba vacío y sin código que
// lo usara. Al eliminarlo, este archivo y el `package.json` raíz que solo existe
// para dar soporte a `@neon/config` se pueden borrar; ese borrado forma parte del
// corte de la migración, documentado en docs/despliegue-terraform.md.
//
// Hasta que se complete el corte, mantener el proyecto de Neon existente sin
// tocar: este archivo no describe ya el estado real, pero borrarlo antes de
// tiempo ocultaría el único rastro de que ese bucket existió.

import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // buckets: {
  //   media: { access: "public_read" },
  // },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
