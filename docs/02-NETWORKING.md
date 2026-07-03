# Networking Verification

Three custom bridge networks enforce isolation by membership — containers can
only reach each other if they share a network.

| Network | Members | Type |
|---|---|---|
| frontend-net | frontend, api | bridge |
| backend-net | api, worker, redis | bridge |
| internal-net | api, worker, postgres | bridge, `internal: true` (no external route) |

## Verified isolation tests (real command output)

| Test | Command | Result |
|---|---|---|
| Frontend → Worker | `wget http://worker:4000` | FAILED — `bad address 'worker:4000'` (DNS resolution failure) |
| Frontend → API | `wget http://api:4000/health` | SUCCESS — `{"status":"ok"}` |
| Worker → Frontend | Python `socket.create_connection` | FAILED — `Name or service not known` |
| Frontend → Postgres | `wget http://postgres:5432` | FAILED — `bad address 'postgres:5432'` |
| API → Redis | Node `net.createConnection` | SUCCESS |
| Worker → Redis | Python `socket.create_connection` | SUCCESS |
| Frontend → Redis | `wget http://redis:6379` | FAILED — `bad address 'redis:6379'` |

## Host exposure

Only `frontend` (`3000`) and `api` (`4000`, required for browser-side fetch
calls since the browser runs outside Docker) are published to the host.
`postgres`, `redis`, and `worker` have zero `ports:` mappings — confirmed via:
```bash
docker port postgres   # empty output
docker port redis      # empty output
```
