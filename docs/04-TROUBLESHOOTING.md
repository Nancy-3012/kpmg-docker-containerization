# Troubleshooting Guide

Real issues encountered and resolved during this project, documented as-is.

## "Cannot connect to Docker daemon"
Docker Desktop isn't running. Open the Docker Desktop app and wait for the
whale icon to show steady before retrying.

## Frontend loads but "Add" button does nothing / browser console shows
## `ERR_CONNECTION_REFUSED` on port 4000
The API container's port wasn't published to the host. The browser runs
**outside** Docker, so it needs `api`'s port exposed via `ports:` in
`docker-compose.yml`, not just reachable by other containers. Also requires
CORS enabled in `server.js` (`app.use(cors())`), or the browser will block
the response even once the port is reachable.

## Frontend shows stale content after rebuilding the image
Browser cache. Hard-refresh (Cmd+Shift+R) or test in an Incognito window,
which bypasses all cache.

## `docker compose up` warns "volume already exists but was not created by
## Docker Compose"
Harmless if you previously created the volume manually (e.g. during Phase 3
testing) with the same name Compose expects. Compose adopts and reuses it;
no data loss occurs. Confirm with `docker volume inspect <name>`.

## Worker container crashes on startup with
## `psycopg2.OperationalError: could not translate host name "postgres"`
Postgres wasn't ready yet when the worker tried to connect. Fixed by adding
retry-with-backoff logic in `worker.py` (10 attempts, 3s apart) instead of a
single connection attempt. Also mitigated by Compose's
`depends_on: condition: service_healthy`, which waits for Postgres to report
healthy before starting the worker at all.

## Hardened container (`read_only: true`) crash-loops with
## `Permission denied` on its data directory
Occurs with official images (Postgres, Redis) whose entrypoint scripts need
to `chown`/access files as part of startup, even though the main process
runs unprivileged. Dropping ALL capabilities blocks this. Fix: add back only
the minimal capabilities needed via `cap_add` (we needed
`CHOWN, DAC_OVERRIDE, FOWNER, SETUID, SETGID` for Postgres and
`CHOWN, DAC_OVERRIDE, SETUID, SETGID` for Redis). Our own app images
(api, worker, frontend) needed **no** `cap_add` at all, since ownership is
set correctly at build time in the Dockerfile.

## YAML "duplicate key" errors in docker-compose.yml
Caused by incorrect indentation — an extra space can make YAML interpret a
new service as nested inside the previous service's last key instead of
being a sibling. Always verify with `docker compose config --quiet`
(silent = valid) before applying changes.

## Container killed but doesn't auto-restart despite `restart: unless-stopped`
Observed inconsistently on Docker Desktop for Mac when using
`docker kill --signal=SIGKILL` directly. Restart policy was confirmed correct
via `docker inspect --format '{{.HostConfig.RestartPolicy.Name}}'`, but the
container remained `Exited` rather than restarting automatically. Manual
recovery via `docker compose up -d <service>` resolved it immediately.
Treat this as a platform-specific quirk to watch for, not a config error —
always verify actual container state with `docker ps -a`, don't assume a
restart policy guarantees instant recovery.

## `docker volume rm` fails with "volume is in use"
Docker refuses to delete a volume attached to any container, even a stopped
one. You must fully `docker rm` the container first. This is a deliberate
safety guard, not a bug.

## Rebuilt an image but container still runs old code
`docker compose up -d <service>` without `--build` reuses the cached image.
Always use `docker compose up -d --build <service>` after code changes.
