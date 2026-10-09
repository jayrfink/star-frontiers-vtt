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
      race TEXT NOT NULL CHECK(length(trim(race)) > 0),
      psa TEXT NOT NULL DEFAULT 'Military' CHECK(psa IN ('Military', 'Technological', 'Biosocial')),
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
      avatar_url TEXT DEFAULT '',
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
      avatar_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      map_type TEXT DEFAULT 'rpg',
      background_url TEXT DEFAULT '',
      preset_bg TEXT DEFAULT 'grid_only',
      width INTEGER NOT NULL DEFAULT 20,
      height INTEGER NOT NULL DEFAULT 20,
      grid_size INTEGER NOT NULL DEFAULT 40,
      grid_color TEXT DEFAULT '#333333',
      is_active INTEGER NOT NULL DEFAULT 0,
      fog_enabled INTEGER NOT NULL DEFAULT 0,
      fog_data TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      map_id INTEGER NOT NULL,
      character_id INTEGER,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#666666',
      avatar_url TEXT DEFAULT '',
      x INTEGER NOT NULL DEFAULT 0,
      y INTEGER NOT NULL DEFAULT 0,
      size INTEGER NOT NULL DEFAULT 1,
      current_hp INTEGER,
      max_hp INTEGER,
      status_effects TEXT DEFAULT '[]',
      layer TEXT NOT NULL DEFAULT 'character',
      rotation INTEGER DEFAULT 0,
      current_speed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
    );
  `);

  const mapCols = db.prepare("PRAGMA table_info(maps)").all().map(c => c.name);
  
  if (!mapCols.includes('fog_enabled')) {
    db.exec('ALTER TABLE maps ADD COLUMN fog_enabled INTEGER NOT NULL DEFAULT 0');
  }
if (!mapCols.includes('map_type')) {
    db.exec('ALTER TABLE maps ADD COLUMN map_type TEXT DEFAULT "rpg"');
  }

  
  const charCols = db.prepare("PRAGMA table_info(character_sheets)").all().map(c => c.name);
  if (!charCols.includes('avatar_url')) {
    db.exec('ALTER TABLE character_sheets ADD COLUMN avatar_url TEXT DEFAULT ""');
  }
  if (!charCols.includes('psa')) {
    db.exec('ALTER TABLE character_sheets ADD COLUMN psa TEXT NOT NULL DEFAULT "Military"');
  }

  const charTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='character_sheets'").get();
  if (charTableInfo && charTableInfo.sql && charTableInfo.sql.includes("CHECK(race IN ('Human', 'Dralasite', 'Vrusk', 'Yazirian'))")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE character_sheets_dg_tmp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        race TEXT NOT NULL CHECK(length(trim(race)) > 0),
        psa TEXT NOT NULL DEFAULT 'Military' CHECK(psa IN ('Military', 'Technological', 'Biosocial')),
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
        avatar_url TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      INSERT INTO character_sheets_dg_tmp (
        id, user_id, name, race, psa, gender, height, weight,
        str, sta, current_sta, dex, rs, int_stat, log_stat, per, ldr,
        racial_abilities, skills, inventory, notes, avatar_url, created_at, updated_at
      )
      SELECT
        id, user_id, name, race, psa, gender, height, weight,
        str, sta, current_sta, dex, rs, int_stat, log_stat, per, ldr,
        racial_abilities, skills, inventory, notes, avatar_url, created_at, updated_at
      FROM character_sheets;
      DROP TABLE character_sheets;
      ALTER TABLE character_sheets_dg_tmp RENAME TO character_sheets;
      PRAGMA foreign_keys = ON;
    `);
  }

  const shipCols = db.prepare("PRAGMA table_info(ship_sheets)").all().map(c => c.name);
  if (!shipCols.includes('avatar_url')) {
    db.exec('ALTER TABLE ship_sheets ADD COLUMN avatar_url TEXT DEFAULT ""');
  }

  const tokenCols = db.prepare("PRAGMA table_info(tokens)").all().map(c => c.name);
  if (!tokenCols.includes('rotation')) {
    db.exec('ALTER TABLE tokens ADD COLUMN rotation INTEGER DEFAULT 0');
  }
  if (!tokenCols.includes('current_speed')) {
    db.exec('ALTER TABLE tokens ADD COLUMN current_speed INTEGER DEFAULT 0');
  }
}

export function createDb(dbPath = DEFAULT_DB_PATH) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

