const { Pool } = require("pg");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { put, list, download } = require("@vercel/blob");

const SEED_DATABASE = require("../../data/database.json");
const SEED_DATABASE_PATH = path.join(__dirname, "..", "..", "data", "database.json");
const SEED_SCHEMA_VERSION = 5;
const SEED_LOGIN_EMAIL = "offshorea704@gmail.com";
const DATABASE_PATH = process.env.VERCEL && !process.env.DATABASE_URL
  ? path.join(os.tmpdir(), "bank-portal-database.json")
  : SEED_DATABASE_PATH;
const REMOTE_DATABASE_KEY = process.env.BANK_DATABASE_KEY || "bank-portal-database";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";
const NEON_DATABASE_URL = process.env.DATABASE_URL || "";
const REMOTE_DATABASE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REMOTE_DATABASE_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

let vercelDatabaseCache = null;
let pgPool = null;
let pgReady = false;
let lastConnectionError = null;
let blobCache = null;

let dbMutex = null;
let dbQueue = [];

function withDbLock(callback) {
  return new Promise((resolve, reject) => {
    dbQueue.push(async () => {
      try {
        const result = await callback();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        dbMutex = null;
        processDbQueue();
      }
    });
    processDbQueue();
  });
}

function processDbQueue() {
  if (dbMutex || !dbQueue.length) return;
  dbMutex = true;
  const next = dbQueue.shift();
  Promise.resolve(next()).catch(() => {});
}

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

function getCleanNeonUrl() {
  if (!NEON_DATABASE_URL) return null;
  try {
    const url = new URL(NEON_DATABASE_URL);
    url.search = "";
    return url.toString();
  } catch (error) {
    console.error("[DB] Invalid DATABASE_URL", error);
    return null;
  }
}

function getPgPool() {
  const cleanUrl = getCleanNeonUrl();
  if (!cleanUrl) {
    console.error("[DB] DATABASE_URL not configured or invalid, Neon disabled");
    return null;
  }

  // Force pool reset if previous connection failed
  if (lastConnectionError && !pgPool) {
    lastConnectionError = null;
  }

  if (!pgPool) {
    console.error("[DB] Creating pg pool for Neon. URL:", cleanUrl.replace(/\/\/.*@/, "//***@"));
    try {
      pgPool = new Pool({
        connectionString: cleanUrl,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      pgPool.on("error", (error) => {
        console.error("[DB] Pool error:", error);
        console.error("[DB] Pool error stack:", error.stack);
        pgReady = false;
      });
    } catch (error) {
      console.error("[DB] Failed to instantiate Pool:", error);
      console.error("[DB] Pool instantiation stack:", error.stack);
      return null;
    }
  }

  return pgPool;
}

async function ensureNeonTable(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portal_data (
        key TEXT PRIMARY KEY,
        json_data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    console.log("[DB] Neon table ensured successfully");
    pgReady = true;
    return true;
  } catch (error) {
    console.error("[DB] ensureNeonTable FAILED:", error);
    console.error("[DB] Error code:", error.code);
    console.error("[DB] Error message:", error.message);
    pgReady = false;
    return false;
  }
}

async function withPgPool(callback) {
  const pool = getPgPool();

  if (!pool) {
    console.error("[DB] Neon pool unavailable via getPgPool()");
    return null;
  }

  if (!pgReady) {
    const tableReady = await ensureNeonTable(pool);
    if (!tableReady) {
      console.error("[DB] Neon table setup failed - falling back to local/seeded data");
      await closePoolSilently();
      return null;
    }
  }

  try {
    const client = await pool.connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[DB] Neon query failed:", error);
    console.error("[DB] Neon query stack:", error.stack);
    console.error("[DB] Error code:", error.code);
    console.error("[DB] Error message:", error.message);
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
  if (NEON_DATABASE_URL) {
    return withDbLock(async () => {
      let database;
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

      if (!database) {
        database = await readSeedDatabase();
      }

      const synced = await applySeedIfStale(database);

      if (synced !== database) {
        try {
          synced.updatedAt = new Date().toISOString();
          await persistDatabase(synced);
        } catch (error) {
          console.error("[DB] could not persist seed refresh", error);
        }
        return synced;
      }

      return database;
    });
  }

  if (BLOB_TOKEN) {
    return withDbLock(async () => {
      let database = await readBlobDatabase();

      if (!database) {
        database = await readSeedDatabase();
      }

      const synced = await applySeedIfStale(database);

      if (synced !== database) {
        try {
          synced.updatedAt = new Date().toISOString();
          await persistDatabase(synced);
        } catch (error) {
          console.error("[DB] could not persist seed refresh", error);
        }
        return synced;
      }

      return database;
    });
  }

  return withDbLock(async () => {
    let database;

    if (hasRemoteDatabase()) {
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
        synced.updatedAt = new Date().toISOString();
        await persistDatabase(synced);
      } catch (error) {
        console.error("[DB] could not persist seed refresh", error);
      }
      return synced;
    }

    return database;
  });
}

async function writeDatabase(database) {
  database.updatedAt = new Date().toISOString();

  return withDbLock(async () => persistDatabase(database));
}

async function persistDatabase(database) {
  if (NEON_DATABASE_URL) {
    const result = await withPgPool(async (client) => {
      const insertResult = await client.query(
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
      return insertResult;
    });

    if (!result || result.rowCount === 0) {
      console.error("[DB] Neon write failed or no rows affected:", result);
      throw new Error("Neon write failed");
    }
    return;
  }

  if (BLOB_TOKEN) {
    try {
      await writeBlobDatabase(database);
    } catch (error) {
      console.error("[DB] Blob write failed:", error);
    }
    return;
  }

  if (hasRemoteDatabase()) {
    try {
      await writeRemoteDatabase(database);
    } catch (error) {
      console.error("[DB] remote write failed (continuing without persist)", error);
    }
    return;
  }

  if (process.env.VERCEL) {
    vercelDatabaseCache = database;
    return;
  }

  await ensureDatabaseFile();
  const payload = JSON.stringify(database, null, 2);
  console.error("[DB] Writing to", DATABASE_PATH, "user count:", (database.users || []).length, "payload length:", payload.length);
  await fs.writeFile(DATABASE_PATH, payload);
  console.error("[DB] Write complete");
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
  const mode = NEON_DATABASE_URL ? "neon"
    : BLOB_TOKEN ? "blob"
    : hasRemoteDatabase() ? "remote"
    : process.env.VERCEL ? "vercel-memory"
    : "local";

  return {
    mode,
    key: REMOTE_DATABASE_KEY,
    persistent: Boolean(NEON_DATABASE_URL || BLOB_TOKEN || hasRemoteDatabase()),
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
        console.error("[DB] remote JSON parse failed, using seed", parseError);
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

const BLOB_PATHNAME = `${REMOTE_DATABASE_KEY}.json`;

async function readBlobDatabase() {
  try {
    const result = await list({
      token: BLOB_TOKEN,
      prefix: REMOTE_DATABASE_KEY
    });

    const existing = result.blobs.find(
      (blob) => blob.pathname === BLOB_PATHNAME || blob.pathname === BLOB_PATHNAME.replace(/^\//, "")
    );

    if (!existing) {
      return null;
    }

    const { blob } = await download(existing.url, {
      token: BLOB_TOKEN
    });

    const text = await blob.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("[DB] Blob read failed:", error);
    return null;
  }
}

async function writeBlobDatabase(database) {
  await put(
    BLOB_PATHNAME,
    JSON.stringify(database, null, 2),
    {
      token: BLOB_TOKEN,
      contentType: "application/json",
      access: "private"
    }
  );

  blobCache = null;
}

async function closePoolSilently() {
  try {
    if (pgPool) {
      await pgPool.end();
    }
  } catch (error) {
    // ignore cleanup errors
  } finally {
    pgPool = null;
    pgReady = false;
  }
}

async function closePool() {
  await closePoolSilently();
  blobCache = null;
}

module.exports = {
  getDatabaseInfo,
  readDatabase,
  writeDatabase,
  closePool
};
