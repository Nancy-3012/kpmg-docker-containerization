const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'apppass',
  database: process.env.DB_NAME || 'appdb',
});

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`,
});
redisClient.on('error', (err) => console.error('Redis error:', err));

let dbReady = false;
let redisReady = false;

async function init() {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS tasks (id SERIAL PRIMARY KEY, name TEXT, status TEXT DEFAULT \'pending\', created_at TIMESTAMP DEFAULT NOW())');
    dbReady = true;
    console.log('Postgres connected & table ready');
  } catch (e) {
    console.error('DB init failed', e.message);
  }

  try {
    await redisClient.connect();
    redisReady = true;
    console.log('Redis connected');
  } catch (e) {
    console.error('Redis connect failed', e.message);
  }
}

app.get('/health', (req, res) => {
  if (dbReady && redisReady) return res.status(200).json({ status: 'ok' });
  return res.status(503).json({ status: 'degraded', dbReady, redisReady });
});

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id DESC LIMIT 50');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const result = await pool.query('INSERT INTO tasks (name) VALUES ($1) RETURNING *', [name]);
    await redisClient.lPush('task_queue', String(result.rows[0].id));
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const server = app.listen(PORT, () => console.log(`API listening on ${PORT}`));

init();

// Graceful shutdown
function shutdown(signal) {
  console.log(`${signal} received: closing server gracefully`);
  server.close(async () => {
    await pool.end();
    if (redisClient.isOpen) await redisClient.quit();
    console.log('Cleanup complete, exiting');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));