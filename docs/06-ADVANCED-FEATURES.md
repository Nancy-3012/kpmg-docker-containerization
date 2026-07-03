# Advanced Docker Features (Phase 10)

## Multi-stage builds, build cache, BuildKit, build args
Demonstrated throughout every Dockerfile (api, worker, frontend) — see
Phase 1. Build cache visible as `CACHED [...]` layers in every rebuild;
BuildKit used automatically by Docker Desktop.

## Docker Secrets
`POSTGRES_PASSWORD` is provided via a file-based secret rather than a plain
environment variable:

```yaml
secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt

services:
  postgres:
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password
```

Verified: `docker inspect postgres` shows only the **path**
(`/run/secrets/postgres_password`) in `Config.Env`, never the literal
password — unlike a plain `POSTGRES_PASSWORD: apppass` environment entry,
which would be readable by anyone with `docker inspect` access.

`secrets/` is gitignored — never commit real secret files.

## Compose Profiles
An optional `db-inspector` debug service is gated behind the `debug`
profile:

```yaml
db-inspector:
  profiles: ["debug"]
```

- `docker compose up -d` — `db-inspector` does NOT start (verified)
- `docker compose --profile debug up -d` — `db-inspector` starts (verified)

Useful for optional tooling (debug shells, admin UIs) you don't want running
by default in every environment.

## Extension Fields (x-) + YAML Anchors
Eliminated duplicated security-hardening config across `api`, `worker`, and
`frontend` (5 identical lines each) using an extension field + YAML anchor:

```yaml
x-security-hardening: &security-hardening
  read_only: true
  tmpfs:
    - /tmp
  cap_drop:
    - ALL
  security_opt:
    - no-new-privileges:true
```

Each service then references it with a single line:
```yaml
    <<: *security-hardening
```

The `x-` prefix tells Compose to ignore the block as a real service/config
key (it's purely for reuse), while `&name` / `*name` / `<<:` are standard
YAML anchor, alias, and merge-key syntax respectively. Verified via
`docker compose config` (renders the full merged config) and confirming all
3 containers still show correct hardening via `docker inspect`.

## Pruning
```bash
docker image prune -f      # removed dangling image layers from rebuild cycles (67MB reclaimed)
docker container prune -f  # no stopped containers to remove (already cleaned as we went)
docker volume prune -f     # no unused volumes (all 4 named volumes actively attached)
docker network prune -f    # no unused networks
docker builder prune -f    # build cache cleanup
```
Confirmed the running stack (`docker compose ps`) was completely unaffected —
pruning only removes genuinely unused resources, never anything in active use.
