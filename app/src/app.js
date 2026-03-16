const express = require("express");
const { Pool } = require("pg");
const Redis = require("ioredis");

const app = express();
app.use(express.json());

// Database
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "appdb",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "password",
  max: 10,
  connectionTimeoutMillis: 5000,
});

// Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err.message));

// Initialize DB
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Database initialized");
  } finally {
    client.release();
  }
}

// Health — checks DB + Redis
app.get("/health", async (req, res) => {
  let db = { connected: false };
  let cache = { connected: false };

  try {
    const r = await pool.query("SELECT 1");
    db = { connected: true };
  } catch (e) {
    db = { connected: false, error: e.message };
  }

  try {
    const pong = await redis.ping();
    cache = { connected: pong === "PONG" };
  } catch (e) {
    cache = { connected: false, error: e.message };
  }

  const healthy = db.connected && cache.connected;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    version: process.env.APP_VERSION || "1.0.0",
    pod: process.env.HOSTNAME || "unknown",
    timestamp: new Date().toISOString(),
    services: { database: db, cache },
  });
});

// Info
app.get("/info", (req, res) => {
  res.json({
    app: "gitops-api",
    version: process.env.APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    pod: process.env.HOSTNAME || "unknown",
    runtime: "Bun",
    uptime: Math.floor(process.uptime()),
  });
});

// GET /notes — cached 30s
app.get("/notes", async (req, res) => {
  try {
    const cached = await redis.get("notes:all");
    if (cached) return res.json({ source: "cache", notes: JSON.parse(cached) });

    const result = await pool.query("SELECT * FROM notes ORDER BY created_at DESC");
    await redis.setex("notes:all", 30, JSON.stringify(result.rows));
    res.json({ source: "database", notes: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /notes
app.post("/notes", async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const result = await pool.query(
      "INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *",
      [title, content || null]
    );
    await redis.del("notes:all");
    res.status(201).json({ note: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /notes/:id
app.delete("/notes/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM notes WHERE id = $1 RETURNING *", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    await redis.del("notes:all");
    res.json({ deleted: result.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Root
app.get("/", (req, res) => {
  res.json({
    message: "GitOps API — EKS + ArgoCD + Helm",
    version: process.env.APP_VERSION || "1.0.0",
    pod: process.env.HOSTNAME || "unknown",
    endpoints: {
      "GET /health": "DB + Redis health",
      "GET /info": "Pod and app metadata",
      "GET /notes": "List notes (cached 30s)",
      "POST /notes": "Create note { title, content }",
      "DELETE /notes/:id": "Delete note",
    },
  });
});

module.exports = { app, initDB };
