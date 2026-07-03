# ---------- Stage 1: dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---------- Stage 2: final runtime image ----------
FROM node:20-alpine AS runtime

ARG APP_VERSION=1.0.0
ARG BUILD_DATE

LABEL maintainer="nancy@kpmg-internship" \
      org.opencontainers.image.title="task-api" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.description="Node.js API service for KPMG Docker task"

ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app

# Create a non-root user/group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY server.js package.json ./

# Directories the app may need to write to
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["node"]
CMD ["server.js"]