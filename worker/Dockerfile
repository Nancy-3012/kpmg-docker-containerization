# ---------- Stage 1: build dependencies ----------
FROM python:3.12-slim AS deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ---------- Stage 2: final runtime image ----------
FROM python:3.12-slim AS runtime

ARG APP_VERSION=1.0.0
ARG BUILD_DATE

LABEL maintainer="nancy@kpmg-internship" \
      org.opencontainers.image.title="task-worker" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.description="Python worker service for KPMG Docker task"

ENV PYTHONUNBUFFERED=1 \
    PATH=/home/appuser/.local/bin:$PATH

WORKDIR /app

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup -m appuser

COPY --from=deps /root/.local /home/appuser/.local
COPY worker.py .

RUN mkdir -p /app/logs && chown -R appuser:appgroup /app /home/appuser/.local

USER appuser

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import redis,os,sys; r=redis.Redis(host=os.environ.get('REDIS_HOST','redis'),port=int(os.environ.get('REDIS_PORT',6379))); sys.exit(0 if r.ping() else 1)" || exit 1

ENTRYPOINT ["python"]
CMD ["-u", "worker.py"]