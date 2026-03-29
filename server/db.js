import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On Render, DATA_DIR points to the persistent disk mount path (e.g. /data).
// Locally it falls back to ../data relative to the server folder.
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'migraine.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS headache_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      pain_location TEXT DEFAULT '[]',
      pain_area TEXT DEFAULT '[]',
      intensity INTEGER CHECK(intensity >= 1 AND intensity <= 10),
      time_of_day TEXT,
      duration_hours REAL,
      medications TEXT DEFAULT '[]',
      symptoms TEXT DEFAULT '[]',
      triggers TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS preventive_medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      medication_name TEXT NOT NULL,
      medication_type TEXT,
      dosage TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS period_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_date TEXT NOT NULL UNIQUE,
      cycle_length INTEGER DEFAULT 28,
      period_length INTEGER DEFAULT 5,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_headache_date ON headache_entries(date);
    CREATE INDEX IF NOT EXISTS idx_preventive_date ON preventive_medications(date);
    CREATE INDEX IF NOT EXISTS idx_period_date ON period_entries(start_date);

    CREATE TABLE IF NOT EXISTS weather_cache (
      date TEXT PRIMARY KEY,
      temp_max REAL,
      temp_min REAL,
      precipitation REAL,
      pressure_max REAL,
      pressure_min REAL,
      pressure_delta REAL,
      weathercode INTEGER,
      fetched_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export default db;
