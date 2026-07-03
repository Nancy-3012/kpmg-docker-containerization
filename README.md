# KPMG Docker Internship — Task 01: Legacy App Containerization

Production-ready containerization of a multi-service application using
**only Docker and Docker Compose** — no Kubernetes, Helm, Terraform, Ansible,
Jenkins, or reverse proxies outside the app itself.

## Stack

- **Frontend**: React (Vite) — served via `serve` (no Nginx, per task constraints)
- **API**: Node.js + Express
- **Worker**: Python (Redis queue consumer)
- **Database**: PostgreSQL 16
- **Queue/Cache**: Redis 7

## Quick start

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Open http://localhost:3000

Full instructions: [`docs/01-STARTUP.md`](docs/01-STARTUP.md)

## Documentation

| File | Contents |
|---|---|
| [docs/01-STARTUP.md](docs/01-STARTUP.md) | Setup, running, stopping, rebuilding |
| [docs/02-NETWORKING.md](docs/02-NETWORKING.md) | Network isolation design + verified proof |
| [docs/03-BACKUP-RESTORE.md](docs/03-BACKUP-RESTORE.md) | Backup/restore procedures for Postgres, Redis, volumes |
| [docs/04-TROUBLESHOOTING.md](docs/04-TROUBLESHOOTING.md) | Real issues hit during development, with fixes |
| [docs/05-CONTAINER-LIFECYCLE.md](docs/05-CONTAINER-LIFECYCLE.md) | Container states, restart policies, health checks, rebuild vs restart |

## Architecture
┌─────────────┐
host:3000 ──▶ │  frontend   │
└──────┬──────┘
│ frontend-net
┌──────▼──────┐
host:4000 ──▶ │     api     │
└───┬─────┬───┘
internal-net  backend-net
┌───▼──┐ ┌──▼────┐   ┌────────┐
│postgres│ │ redis │◀──│ worker │
└────────┘ └───────┘   └────────┘
internal-net + backend-net
- Only `frontend` and `api` are reachable from the host.
- `postgres` is fully isolated (`internal-net` has no external route).
- `worker` cannot reach `frontend` — no shared network.
- All isolation claims verified with real `docker exec`/`wget`/`socket`
  tests — see `docs/02-NETWORKING.md`.

## Security hardening applied to every container

- Non-root user
- Read-only root filesystem (with explicit tmpfs/volume exceptions where needed)
- Dropped all Linux capabilities, re-added only what's strictly required
- `no-new-privileges`
- PID, memory, and CPU limits (enforcement verified via real stress tests —
  OOM kill, CPU throttling, fork-bomb block)

## Task compliance

Built strictly with Docker Engine, Docker Compose, and Docker CLI only.
No Kubernetes, Helm, Terraform, Ansible, Jenkins, Prometheus/Grafana, or
Nginx/reverse proxy were used at any point.
