# ============================================
# Multi-stage build para NestJS
# ============================================

# ----------- ETAPA 1: BUILD -----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar TODAS las dependencias (incluidas devDependencies para poder compilar)
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build


# ----------- ETAPA 2: PRODUCCIÓN -----------
FROM node:20-alpine AS production

WORKDIR /app

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

ENV TZ=America/Lima
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/America/Lima /etc/localtime && \
    echo "America/Lima" > /etc/timezone

# Copiar package.json para instalar solo deps de producción
COPY package*.json ./

# Instalar SOLO dependencias de producción (más liviano)
RUN npm ci --only=production && npm cache clean --force

# Copiar el código compilado desde la etapa de build
COPY --from=builder /app/dist ./dist

# Crear carpeta uploads para logos (la usa tu sistema)
RUN mkdir -p uploads/logos

# Exponer el puerto del backend
EXPOSE 3000

# Healthcheck (Dokploy lo usa para saber si está vivo)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando para arrancar el servidor
CMD ["node", "dist/main"]