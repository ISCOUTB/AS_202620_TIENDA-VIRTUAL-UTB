import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La imagen de producción es `node:22-alpine` sin `sharp`: el optimizador
  // de next/image requiere binarios que no están en la imagen standalone.
  // Las fotos ya se sirven en su tamaño razonable desde /public.
  images: { unoptimized: true },

  output: "standalone",

  // Sin esto Next infiere la raíz del workspace desde un package-lock ajeno y
  // el árbol de `.next/standalone` sale con una profundidad inesperada, que
  // rompe el COPY del Dockerfile.
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;
