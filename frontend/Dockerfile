# ---------- Stage 1: install deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- Stage 2: build the React app ----------
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=${VITE_API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Stage 3: minimal production runtime ----------
FROM node:20-alpine AS runtime

ARG APP_VERSION=1.0.0
ARG BUILD_DATE

LABEL maintainer="nancy@kpmg-internship" \
      org.opencontainers.image.title="task-frontend" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.description="React frontend for KPMG Docker task, served via lightweight static server (no reverse proxy)"

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    npm install -g serve@14

COPY --from=build /app/dist ./dist
RUN chown -R appuser:appgroup /app

USER appuser

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["serve"]
CMD ["-s", "dist", "-l", "3000"]