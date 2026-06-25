const { Pool } = require("pg");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const SEED_DATABASE = require("../../data/database.json");
const SEED_DATABASE_PATH = path.join(__dirname, "..", "..", "data", "database.json");
const SEED_SCHEMA_VERSION = 5;
const SEED_LOGIN_EMAIL = "offshorea704@gmail.com";
const DATABASE_PATH = process.env.VERCEL && !process.env.DATABASE_URL
  ? path.join(os.tmpdir(), "bank-portal-database.json")
  : SEED_DATABASE_PATH;
const REMOTE_DATABASE_KEY = process.env.BANK_DATABASE_KEY || "bank-portal-database";
const NEON_DATABASE_URL = process.env.DATABASE_URL || "";
const REMOTE_DATABASE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REMOTE_DATABASE_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

let vercelDatabaseCache = null;
let pgPool = null;
let pgReady = false;

function cloneSeedDatabase() {
  return JSON.parse(JSON.stringify(SEED_DATABASE));
}

async function readSeedDatabase() {
  try {
    const content = await fs.readFile(SEED_DATABASE_PATH, "utf8");
    return JSON.parse(content);
  } catch (error) {
    return cloneSeedDatabase();
  }
}

function getPgPool() {
  if (!NEON_DATABASE_URL) {
    return null;
  }

  if (!pgPool) {
    pgPool = new Pool({
      connectionString: NEON_DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  return pgPool;
}

async function ensureNeonTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_data (
      key TEXT PRIMARY KEY,
      json_data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function withPgPool(callback) {
  const pool = getPgPool();

  if (!pool) {
    return null;
  }

  if (!pgReady) {
    await ensureNeonTable(pool);
    pgReady = true;
  }

  try {
    const client = await pool.connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("databaseService: Neon query failed", error);
    return null;
  }
}

function databaseNeedsSeedRefresh(database) {
  const currentVersion = Number(database?.schemaVersion || 0);
  const hasSeedUser = (database?.users || []).some((user) => user.email === SEED_LOGIN_EMAIL);
  return currentVersion < SEED_SCHEMA_VERSION || !hasSeedUser;
}

async function applySeedIfStale(database) {
  if (!databaseNeedsSeedRefresh(database)) {
    return database;
  }

  const seed = await readSeedDatabase();
  return {
    ...seed,
    updatedAt: new Date().toISOString()
  };
}

async function readDatabase() {
  let database;

  if (NEON_DATABASE_URL) {
    const row = await withPgPool(async (client) => {
      const result = await client.query(
        "SELECT json_data FROM portal_data WHERE key = $1",
        [REMOTE_DATABASE_KEY]
      );
      const record = result.rows[0];
      return record ? record.json_data : null;
    });

    if (row) {
      database = typeof row === "string" ? JSON.parse(row) : row;
    }
  } else if (hasRemoteDatabase()) {
    database = await readRemoteDatabase();
  } else if (process.env.VERCEL) {
    if (!vercelDatabaseCache) {
      vercelDatabaseCache = await readSeedDatabase();
    }
    database = vercelDatabaseCache;
  } else {
    await ensureDatabaseFile();
    const content = await fs.readFile(DATABASE_PATH, "utf8");
    database = JSON.parse(content);
  }

  if (!database) {
    database = await readSeedDatabase();
  }

  const synced = await applySeedIfStale(database);

  if (synced !== database) {
    try {
      await writeDatabase(synced);
    } catch (error) {
      console.error("databaseService: could not persist seed refresh", error);
    }
    return synced;
  }

  return database;
}

async function writeDatabase(database) {
  database.updatedAt = new Date().toISOString();

  if (NEON_DATABASE_URL) {
    const written = await withPgPool(async (client) => {
      await client.query(
        `
        INSERT INTO portal_data (key, json_data, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (key)
        DO UPDATE SET
          json_data = EXCLUDED.json_data::jsonb,
          updated_at = EXCLUDED.updated_at
        `,
        [REMOTE_DATABASE_KEY, JSON.stringify(database)]
      );
    });

    if (!written) {
      console.error("databaseService: Neon write failed (continuing without persist)");
    }
    return;
  }

  if (hasRemoteDatabase()) {
    try {
      await writeRemoteDatabase(database);
    } catch (error) {
      console.error("databaseService: remote write failed (continuing without persist)", error);
    }
    return;
  }

  if (process.env.VERCEL) {
    vercelDatabaseCache = database;
    return;
  }

  await ensureDatabaseFile();
  await fs.writeFile(DATABASE_PATH, JSON.stringify(database, null, 2));
}

async function ensureDatabaseFile() {
  try {
    await fs.access(DATABASE_PATH);
  } catch (error) {
    const seed = await readSeedDatabase();
    await fs.writeFile(DATABASE_PATH, JSON.stringify(seed, null, 2));
  }
}

function hasRemoteDatabase() {
  return Boolean(REMOTE_DATABASE_URL && REMOTE_DATABASE_TOKEN);
}

function getDatabaseInfo() {
  return {
    mode: NEON_DATABASE_URL ? "neon" : hasRemoteDatabase() ? "remote" : process.env.VERCEL ? "vercel-memory" : "local",
    key: REMOTE_DATABASE_KEY,
    persistent: Boolean(NEON_DATABASE_URL || hasRemoteDatabase()),
    schemaVersion: SEED_SCHEMA_VERSION,
    seedLoginEmail: SEED_LOGIN_EMAIL
  };
}

async function readRemoteDatabase() {
  try {
    const response = await fetch(`${REMOTE_DATABASE_URL}/get/${encodeURIComponent(REMOTE_DATABASE_KEY)}`, {
      headers: {
        Authorization: `Bearer ${REMOTE_DATABASE_TOKEN}`
      }
    });

    if (!response.ok) {
      return readSeedDatabase();
    }

    const payload = await response.json();

    if (payload.result) {
      try {
        return JSON.parse(payload.result);
      } catch (parseError) {
        console.error("databaseService: remote JSON parse failed, using seed", parseError);
        return readSeedDatabase();
      }
    }

    return readSeedDatabase();
  } catch (error) {
    return readSeedDatabase();
  }
}

async function writeRemoteDatabase(database) {
  const response = await fetch(`${REMOTE_DATABASE_URL}/set/${encodeURIComponent(REMOTE_DATABASE_KEY)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REMOTE_DATABASE_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(JSON.stringify(database))
  });

  if (!response.ok) {
    throw new Error("Remote database write failed");
  }
}

async function closePool() {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
    pgReady = false;
  }
}

module.exports = {
  getDatabaseInfo,
  readDatabase,
  writeDatabase,
  closePool
};
