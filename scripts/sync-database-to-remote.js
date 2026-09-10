const fs = require('fs');
const path = require('path');

const { Pool } = require('pg');
const { put } = require('@vercel/blob');

const localDbPath = path.join(__dirname, '..', 'backend', 'data', 'database.json');
const localDb = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));

const REMOTE_DATABASE_KEY = process.env.BANK_DATABASE_KEY || 'bank-portal-database';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
const NEON_DATABASE_URL = process.env.DATABASE_URL || '';

async function syncToNeon() {
  if (!NEON_DATABASE_URL) {
    console.log('No DATABASE_URL, skipping Neon sync');
    return false;
  }
  
  const pool = new Pool({
    connectionString: NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portal_data (
        key TEXT PRIMARY KEY,
        json_data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    const result = await pool.query(
      `INSERT INTO portal_data (key, json_data, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key)
       DO UPDATE SET json_data = EXCLUDED.json_data::jsonb, updated_at = EXCLUDED.updated_at`,
      [REMOTE_DATABASE_KEY, JSON.stringify(localDb)]
    );
    
    console.log('Synced to Neon:', result.rowCount, 'rows affected');
    await pool.end();
    return true;
  } catch (error) {
    console.error('Neon sync failed:', error.message);
    await pool.end();
    return false;
  }
}

async function syncToBlob() {
  if (!BLOB_TOKEN) {
    console.log('No BLOB_READ_WRITE_TOKEN, skipping Blob sync');
    return false;
  }
  
  try {
    await put(`${REMOTE_DATABASE_KEY}.json`, JSON.stringify(localDb, null, 2), {
      token: BLOB_TOKEN,
      contentType: 'application/json',
      access: 'private',
      allowOverwrite: true
    });
    console.log('Synced to Vercel Blob');
    return true;
  } catch (error) {
    console.error('Blob sync failed:', error.message);
    return false;
  }
}

async function syncToUpstash() {
  const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  
  if (!KV_URL || !KV_TOKEN) {
    console.log('No Upstash KV credentials, skipping KV sync');
    return false;
  }
  
  try {
    const response = await fetch(`${KV_URL}/set/${encodeURIComponent(REMOTE_DATABASE_KEY)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(JSON.stringify(localDb))
    });
    
    if (!response.ok) {
      throw new Error(`Upstash write failed: ${response.status}`);
    }
    
    console.log('Synced to Upstash KV');
    return true;
  } catch (error) {
    console.error('Upstash sync failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('Syncing local database to remote storage...');
  console.log('Local users:', localDb.users.length);
  console.log('Schema version:', localDb.schemaVersion);
  
  // Try in priority order (same as databaseService)
  if (NEON_DATABASE_URL) {
    await syncToNeon();
  } else if (BLOB_TOKEN) {
    await syncToBlob();
  } else {
    await syncToUpstash();
  }
  
  console.log('Done');
}

main();