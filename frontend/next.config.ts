import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La imagen de producción es `node:22-alpine` sin `sharp`: el optimizador
  // de next/image requiere binarios que no están en la imagen standalone.
  // Las fotos ya se sirven en su tamaño razonable desde /public.
  images: { unoptimized: true },

  output: "standalone",

  // Sin esto Next infiere la raíz del workspace desde un lockfile ajeno y
  // el árbol de `.next/standalone` sale con una profundidad inesperada, que
  // rompe el COPY del Dockerfile.
  outputFileTracingRoot: path.resolve(process.cwd()),

  // Rutas que la gente (y las pruebas E2E) escribe a mano; las reales viven
  // bajo /auth. Temporales (307) por si algún día existen como páginas.
  async redirects() {
    return [
      { source: "/login", destination: "/auth/ingresar", permanent: false },
      { source: "/registro", destination: "/auth/crear-cuenta", permanent: false },
    ];
  },
};

export default nextConfig;
