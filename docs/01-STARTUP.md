# Startup Documentation

## Prerequisites
- Docker Desktop installed and running
- Docker Compose v2 (bundled with Docker Desktop)

## First-time setup

1. Clone the repository:
```bash
   git clone https://github.com/Nancy-3012/kpmg-docker-containerization.git
   cd kpmg-docker-containerization
```

2. Create your `.env` file from the template:
```bash
   cp .env.example .env
```
   Edit `.env` and set real values for `POSTGRES_PASSWORD` at minimum.

3. Build and start the full stack:
```bash
   docker compose up -d --build
```

4. Verify all 5 services are healthy:
```bash
   docker compose ps
```
   All services should show `Up (healthy)` within ~30 seconds. Startup order is
   enforced automatically: `postgres` and `redis` become healthy first, then
   `api` and `worker` (which depend on them), then `frontend`.

5. Access the app:
   - Frontend UI: http://localhost:3000
   - API health check: http://localhost:4000/health

## Stopping the stack

```bash
docker compose down
```

This stops and removes containers but **preserves** named volumes (`pg-data`,
`redis-data`, `app-uploads`, `app-logs`) — your data survives.

To also remove volumes (full reset, destroys all data):
```bash
docker compose down -v
```

## Rebuilding after code changes

```bash
docker compose up -d --build <service-name>
```
Example: `docker compose up -d --build api`

## Architecture summary

| Service | Exposed to host? | Networks |
|---|---|---|
| frontend | Yes (`:3000`) | frontend-net |
| api | Yes (`:4000`) | frontend-net, backend-net, internal-net |
| worker | No | backend-net, internal-net |
| postgres | No | internal-net (isolated, no external route) |
| redis | No | backend-net |

Frontend can only reach API. Worker cannot reach Frontend. Database is fully
isolated from the host and from Frontend. Redis is reachable only by API and
Worker. See `docs/02-NETWORKING.md` for verification evidence.
