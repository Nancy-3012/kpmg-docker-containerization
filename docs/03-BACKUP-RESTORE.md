# Backup & Restore

## Important: named volumes are NOT a backup

We proved this directly (see Phase 9 failure scenario testing): running
`docker volume rm pg-data` after removing the postgres container permanently
destroyed all task data. Docker's named volumes only protect data from
**container** lifecycle events (stop/rm/recreate) — not from explicit volume
deletion, disk failure, or host loss.

## Backing up PostgreSQL

```bash
docker exec postgres pg_dump -U appuser -d appdb > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Restoring PostgreSQL from a backup

```bash
cat backup_YYYYMMDD_HHMMSS.sql | docker exec -i postgres psql -U appuser -d appdb
```

## Backing up Redis

Redis persists to disk automatically (we configured `--save 60 1 --appendonly yes`
in `docker-compose.yml`, meaning it snapshots every 60s if at least 1 key
changed, plus append-only-file logging). To back up the raw data files:

```bash
docker run --rm -v redis-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/redis-backup-$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

## Restoring Redis from a backup

```bash
docker compose stop redis
docker run --rm -v redis-data:/data -v $(pwd):/backup alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/redis-backup-FILENAME.tar.gz -C /data"
docker compose start redis
```

## Backing up named volumes generically (uploads, logs)

```bash
docker run --rm -v app-uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/app-uploads-backup.tar.gz -C /data .
```

## Recommended practice

Run the Postgres backup command on a schedule (cron, or a dedicated backup
container) and store dumps outside the Docker host — a local named volume is
not a substitute for off-host backup storage.
