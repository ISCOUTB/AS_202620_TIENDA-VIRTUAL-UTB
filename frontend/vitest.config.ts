import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Pruebas unitarias del frontend.
 *
 * El alcance es `lib/`: la lógica que no depende de React ni del navegador
 * más allá de lo que se pueda simular. Los componentes se verifican con la
 * compilación y la revisión visual; aquí se protege lo que rompe en silencio
 * (precios, horarios, agrupación del carrito, aleatoriedad).
 *
 * La cobertura se publica en `coverage/lcov.info`, que
 * `sonar-project.properties` lee como `sonar.javascript.lcov.reportPaths`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      reportsDirectory: "coverage",
      include: ["lib/**/*.ts"],
      exclude: [
        "lib/**/*.d.ts",
        // Generado por scripts/gen-api.mjs a partir del OpenAPI del backend.
        "lib/api/generated/**",
        // Datos de ejemplo, no lógica.
        "lib/mocks/**",
      ],
    },
  },
});
