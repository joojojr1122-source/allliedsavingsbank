const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const SEED_DATABASE = require("../../data/database.json");
const SEED_DATABASE_PATH = path.join(__dirname, "..", "..", "data", "database.json");
const SEED_SCHEMA_VERSION = 3;
const SEED_LOGIN_EMAIL = "demo.customer@example.com";
const DATABASE_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), "bank-portal-database.json")
  : SEED_DATABASE_PATH;
const REMOTE_DATABASE_KEY = process.env.BANK_DATABASE_KEY || "bank-portal-database";
const REMOTE_DATABASE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REMOTE_DATABASE_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

let vercelDatabaseCache = null;

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

  if (hasRemoteDatabase()) {
    try {
      await writeRemoteDatabase(database);
    } catch (error) {
      // Login and other flows call write after reads; a misconfigured KV/Upstash
      // (common on demo projects) must not break sign-in.
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
    mode: hasRemoteDatabase() ? "remote" : process.env.VERCEL ? "vercel-memory" : "local",
    key: REMOTE_DATABASE_KEY,
    persistent: hasRemoteDatabase(),
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

module.exports = {
  getDatabaseInfo,
  readDatabase,
  writeDatabase
};
