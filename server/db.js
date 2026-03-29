import { createClient } from '@libsql/client/http';

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL env var is required. Set it in .env (local) or Netlify env vars (production).');
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

export async function initDB() {
  await db.execute(`CREATE TABLE IF NOT EXISTS headache_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
    pain_location TEXT DEFAULT '[]', pain_area TEXT DEFAULT '[]',
    intensity INTEGER, time_of_day TEXT, duration_hours REAL,
    medications TEXT DEFAULT '[]', symptoms TEXT DEFAULT '[]',
    triggers TEXT DEFAULT '[]', notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS preventive_medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
    medication_name TEXT NOT NULL, medication_type TEXT, dosage TEXT, notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS period_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, start_date TEXT NOT NULL UNIQUE,
    cycle_length INTEGER DEFAULT 28, period_length INTEGER DEFAULT 5, notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')))`);
  await db.execute(`CREATE TABLE IF NOT EXISTS weather_cache (
    date TEXT PRIMARY KEY, temp_max REAL, temp_min REAL, precipitation REAL,
    pressure_max REAL, pressure_min REAL, pressure_delta REAL, weathercode INTEGER,
    fetched_at TEXT DEFAULT (datetime('now')))`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_headache_date ON headache_entries(date)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_preventive_date ON preventive_medications(date)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_period_date ON period_entries(start_date)`);
}

export default db;
