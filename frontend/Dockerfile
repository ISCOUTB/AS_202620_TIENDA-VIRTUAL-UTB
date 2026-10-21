FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
# `--ignore-scripts` (SonarQube S6505): ningún paquete de este proyecto usa
# scripts de instalación —los binarios nativos llegan por dependencias
# opcionales por plataforma— y así la imagen no ejecuta `postinstall` de
# terceros durante el build.
RUN npm ci --ignore-scripts

FROM node:22-alpine AS builder

WORKDIR /app

# `NEXT_PUBLIC_*` se hornea en el bundle durante el build, así que el dominio
# público del sitio tiene que entrar aquí. Sin esto, `sitemap.xml`,
# `robots.txt` y las URLs canónicas salen con `http://localhost:3000`.
ARG NEXT_PUBLIC_SITIO_URL=https://tiendautb-sistema-n0ojjk-fde272-144-24-4-187.sslip.io
ENV NEXT_PUBLIC_SITIO_URL=$NEXT_PUBLIC_SITIO_URL

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# `output: standalone` no copia public/: sin esta línea las 13 fotos, el logo
# y el favicon dan 404 en el contenedor.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
