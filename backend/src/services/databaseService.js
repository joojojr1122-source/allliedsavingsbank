const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const SEED_DATABASE_PATH = path.join(__dirname, "..", "..", "data", "database.json");
const DATABASE_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), "bank-portal-database.json")
  : SEED_DATABASE_PATH;
const REMOTE_DATABASE_KEY = process.env.BANK_DATABASE_KEY || "bank-portal-database";
const REMOTE_DATABASE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REMOTE_DATABASE_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

async function readDatabase() {
  if (hasRemoteDatabase()) {
    return readRemoteDatabase();
  }

  await ensureDatabaseFile();
  const content = await fs.readFile(DATABASE_PATH, "utf8");
  return JSON.parse(content);
}

async function writeDatabase(database) {
  database.updatedAt = new Date().toISOString();

  if (hasRemoteDatabase()) {
    await writeRemoteDatabase(database);
    return;
  }

  await ensureDatabaseFile();
  await fs.writeFile(DATABASE_PATH, JSON.stringify(database, null, 2));
}

async function ensureDatabaseFile() {
  try {
    await fs.access(DATABASE_PATH);
  } catch (error) {
    const seed = await fs.readFile(SEED_DATABASE_PATH, "utf8");
    await fs.writeFile(DATABASE_PATH, seed);
  }
}

function hasRemoteDatabase() {
  return Boolean(REMOTE_DATABASE_URL && REMOTE_DATABASE_TOKEN);
}

function getDatabaseInfo() {
  return {
    mode: hasRemoteDatabase() ? "remote" : "local",
    key: REMOTE_DATABASE_KEY,
    persistent: hasRemoteDatabase()
  };
}

async function readRemoteDatabase() {
  const response = await fetch(`${REMOTE_DATABASE_URL}/get/${encodeURIComponent(REMOTE_DATABASE_KEY)}`, {
    headers: {
      Authorization: `Bearer ${REMOTE_DATABASE_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error("Remote database read failed");
  }

  const payload = await response.json();

  if (payload.result) {
    return JSON.parse(payload.result);
  }

  const seed = JSON.parse(await fs.readFile(SEED_DATABASE_PATH, "utf8"));
  await writeRemoteDatabase(seed);
  return seed;
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
