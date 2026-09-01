import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = path.join(__dirname, '../../data');
const DEFAULT_DB_PATH = path.join(DEFAULT_DATA_DIR, 'app.db');

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Player' CHECK(role IN ('Player', 'GameMaster')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS character_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      race TEXT NOT NULL CHECK(race IN ('Human', 'Dralasite', 'Vrusk', 'Yazirian')),
      gender TEXT,
      height TEXT,
      weight TEXT,
      str INTEGER NOT NULL DEFAULT 50,
      sta INTEGER NOT NULL DEFAULT 50,
      current_sta INTEGER NOT NULL DEFAULT 50,
      dex INTEGER NOT NULL DEFAULT 50,
      rs INTEGER NOT NULL DEFAULT 50,
      int_stat INTEGER NOT NULL DEFAULT 50,
      log_stat INTEGER NOT NULL DEFAULT 50,
      per INTEGER NOT NULL DEFAULT 50,
      ldr INTEGER NOT NULL DEFAULT 50,
      racial_abilities TEXT DEFAULT '{}',
      skills TEXT DEFAULT '[]',
      inventory TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ship_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      ship_type TEXT NOT NULL,
      hull_points INTEGER NOT NULL DEFAULT 50,
      current_hp INTEGER NOT NULL DEFAULT 50,
      adf INTEGER NOT NULL DEFAULT 2,
      mr INTEGER NOT NULL DEFAULT 2,
      dcr INTEGER NOT NULL DEFAULT 50,
      weapons TEXT DEFAULT '[]',
      defenses TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

export function createDb(dbPath = DEFAULT_DB_PATH) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

export function createTestDb() {
  const db = new Database(':memory:');
  migrate(db);
  return db;
}
