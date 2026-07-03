import os
import signal
import sys
import time
import redis
import psycopg2

running = True

def handle_signal(signum, frame):
    global running
    print(f"Received signal {signum}, shutting down gracefully...", flush=True)
    running = False

signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)

def get_redis():
    client = redis.Redis(
        host=os.environ.get("REDIS_HOST", "redis"),
        port=int(os.environ.get("REDIS_PORT", 6379)),
        decode_responses=True,
    )
    client.ping()  # forces connection attempt now, not lazily
    return client

def get_db():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "postgres"),
        port=os.environ.get("DB_PORT", 5432),
        user=os.environ.get("DB_USER", "appuser"),
        password=os.environ.get("DB_PASSWORD", "apppass"),
        dbname=os.environ.get("DB_NAME", "appdb"),
    )

def connect_with_retry(connect_fn, name, retries=10, delay=3):
    for attempt in range(1, retries + 1):
        try:
            conn = connect_fn()
            print(f"{name} connected", flush=True)
            return conn
        except Exception as e:
            print(f"{name} connection failed (attempt {attempt}/{retries}): {e}", flush=True)
            time.sleep(delay)
    raise RuntimeError(f"Could not connect to {name} after {retries} attempts")

def main():
    print("Worker starting...", flush=True)
    r = connect_with_retry(get_redis, "Redis")
    conn = connect_with_retry(get_db, "Postgres")
    conn.autocommit = True
    cur = conn.cursor()

    while running:
        try:
            item = r.brpop("task_queue", timeout=5)
            if item:
                _, task_id = item
                print(f"Processing task {task_id}", flush=True)
                cur.execute("UPDATE tasks SET status = %s WHERE id = %s", ("done", task_id))
        except Exception as e:
            print(f"Worker error: {e}", flush=True)
            time.sleep(2)

    cur.close()
    conn.close()
    print("Worker exited cleanly", flush=True)
    sys.exit(0)

if __name__ == "__main__":
    main()