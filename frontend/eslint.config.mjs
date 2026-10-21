import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

// eslint-config-next se publica en formato eslintrc; FlatCompat lo traduce a
// config plana y aquí se limita a los archivos TypeScript/JavaScript del repo.
const reglasNext = compat
  .extends("next/core-web-vitals", "next/typescript")
  .map((configuracion) => ({
    ...configuracion,
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"],
  }));

const eslintConfig = [
  ...reglasNext,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "**/*.d.ts",
    ],
  },
];

export default eslintConfig;
