# Container Lifecycle Documentation

## Image build → container run flow
Each of `api`, `worker`, `frontend` uses a 3-stage build:
1. **deps/build stage** — installs dependencies, compiles (React build, npm ci)
2. **runtime stage** — copies only the built artifacts into a minimal base
   image, discarding build tools entirely

This keeps final image sizes small (e.g. `task-api` runtime layer adds only
~52MB of actual application content on top of the Alpine base).

## Container states observed and demonstrated

| State | How reached | Command |
|---|---|---|
| Created | Compose creates before starting | `docker compose up --no-start` |
| Running | Normal operation | `docker compose up -d` |
| Paused | Freezes all processes via cgroups | `docker pause <name>` |
| Unpaused | Resumes | `docker unpause <name>` |
| Restarting | Crash + restart policy | Automatic per `restart:` policy |
| Exited | Process terminated | `docker stop` / `docker kill` / crash |
| Removed | Container deleted | `docker rm` |

## Restart policies used

| Service | Policy | Reasoning |
|---|---|---|
| postgres, redis, api, frontend | `unless-stopped` | Always come back up after crash/reboot unless explicitly stopped by an operator |
| worker | `on-failure` | Only restart on non-zero exit (e.g. exhausted retry attempts), since a clean exit is a deliberate signal, not a crash to recover from |

## Health check lifecycle

Every custom service has a `HEALTHCHECK` (Dockerfile) and matching
`healthcheck:` (Compose), each with:
- `interval` — how often to probe
- `timeout` — how long a probe may take before failing
- `retries` — consecutive failures before marking unhealthy
- `start_period` — grace period before failures count (avoids false negatives during slow startup)

`depends_on: condition: service_healthy` in Compose means dependent services
wait for a **real ready state**, not just "container process started" — this
was proven necessary in practice: without it, `worker` crashed on startup
trying to reach Postgres before it was actually accepting connections.

## Full lifecycle demonstrated (Phase 6 CLI Challenge)
Every transition in this chain was performed and verified with real command
output during this project (see project chat history / commit history for
exact commands and outputs).

## Rebuilding vs restarting — the distinction

- `docker compose restart <service>` — restarts the **same** container, same
  image, same filesystem state (if not read-only/ephemeral)
- `docker compose up -d --build <service>` — rebuilds the **image** from the
  Dockerfile first, then recreates the container from the new image. Required
  after any source code change; `restart` alone will NOT pick up code changes.
