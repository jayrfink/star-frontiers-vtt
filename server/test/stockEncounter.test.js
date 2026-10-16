import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stockEncounter } from '../../scripts/stock-encounter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.join(__dirname, 'test_stock_encounter.db');
const TEST_UPLOADS_DIR = path.join(__dirname, 'test_stock_uploads');

describe('stockEncounter Pipeline', () => {
  let db;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    if (fs.existsSync(TEST_UPLOADS_DIR)) fs.rmSync(TEST_UPLOADS_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });

    db = new Database(TEST_DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS maps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        map_type TEXT NOT NULL DEFAULT 'rpg',
        is_active INTEGER NOT NULL DEFAULT 0,
        width INTEGER NOT NULL DEFAULT 20,
        height INTEGER NOT NULL DEFAULT 20,
        grid_size INTEGER NOT NULL DEFAULT 40
      );
      CREATE TABLE IF NOT EXISTS adversary_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('npc', 'creature')),
        threat_tier INTEGER NOT NULL CHECK(threat_tier BETWEEN 1 AND 5),
        token_image_path TEXT NOT NULL DEFAULT '',
        token_size INTEGER NOT NULL DEFAULT 1,
        hp_max INTEGER NOT NULL,
        defense_summary TEXT NOT NULL DEFAULT '',
        movement TEXT NOT NULL DEFAULT '12 m/s',
        initiative_mod INTEGER NOT NULL DEFAULT 0,
        actions TEXT NOT NULL DEFAULT '[]',
        traits TEXT NOT NULL DEFAULT '[]',
        system_data TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        map_id INTEGER NOT NULL,
        character_id INTEGER,
        template_id TEXT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#666666',
        avatar_url TEXT DEFAULT '',
        x INTEGER NOT NULL DEFAULT 0,
        y INTEGER NOT NULL DEFAULT 0,
        size INTEGER NOT NULL DEFAULT 1,
        current_hp INTEGER,
        max_hp INTEGER,
        seu_current INTEGER,
        conditions TEXT DEFAULT '[]',
        status_effects TEXT DEFAULT '[]',
        layer TEXT NOT NULL DEFAULT 'character',
        rotation INTEGER DEFAULT 0,
        current_speed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create an active map
    db.prepare('INSERT INTO maps (name, map_type, is_active, width, height) VALUES (?, ?, ?, ?, ?)').run(
      'Starship Cargo Bay',
      'rpg',
      1,
      20,
      20
    );
  });

  afterEach(() => {
    if (db) db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    if (fs.existsSync(TEST_UPLOADS_DIR)) fs.rmSync(TEST_UPLOADS_DIR, { recursive: true, force: true });
  });

  it('stocks Tier 2 Sathar Shock Troopers into active map', async () => {
    const result = await stockEncounter({
      db,
      uploadsDir: TEST_UPLOADS_DIR,
      name: 'Sathar Shock Trooper',
      threat_tier: 2,
      category: 'npc',
      species: 'Sathar',
      weapon: 'Laser Rifle',
      armor: 'Skein Suit',
      count: 3
    });

    expect(result.template).toBeDefined();
    expect(result.template.template_id).toBe('sathar-shock-trooper-t2');
    expect(result.template.category).toBe('npc');
    expect(result.template.threat_tier).toBe(2);
    expect(result.tokens).toHaveLength(3);
    expect(result.tokens[0].name).toBe('Sathar Shock Trooper #1');
    expect(result.tokens[1].name).toBe('Sathar Shock Trooper #2');
    expect(result.tokens[2].name).toBe('Sathar Shock Trooper #3');

    // Verify token image was generated
    expect(fs.existsSync(path.join(TEST_UPLOADS_DIR, 'tokens', 'sathar-shock-trooper-t2.png'))).toBe(true);
  });

  it('stocks Tier 3 Volturnian Stalker-Beast into active map', async () => {
    const result = await stockEncounter({
      db,
      uploadsDir: TEST_UPLOADS_DIR,
      name: 'Volturnian Stalker-Beast',
      threat_tier: 3,
      category: 'creature',
      attacks: 'Claw, Acid Spit',
      traits: 'Ambush Predator, Acid Spit',
      count: 2
    });

    expect(result.template.category).toBe('creature');
    expect(result.template.threat_tier).toBe(3);
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0].name).toBe('Volturnian Stalker-Beast #1');
    expect(result.tokens[1].name).toBe('Volturnian Stalker-Beast #2');

    // Token coordinates should not collide
    expect(result.tokens[0].x).not.toBe(result.tokens[1].x);
  });
});
