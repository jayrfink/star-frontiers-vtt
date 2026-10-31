import { describe, it, expect, afterEach } from 'vitest';
import { createTestDb, createDb } from '../src/db.js';
import fs from 'fs';
import path from 'path';

describe('Database', () => {
  let db;

  afterEach(() => {
    if (db) {
      db.close();
      db = null;
    }
  });

  it('creates users table with correct columns', () => {
    db = createTestDb();
    const columns = db.pragma('table_info(users)');
    const colNames = columns.map(c => c.name);
    expect(colNames).toEqual(['id', 'username', 'password_hash', 'role', 'created_at']);
  });

  it('defaults role to Player', () => {
    db = createTestDb();
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('testuser', 'hash');
    const user = db.prepare('SELECT role FROM users WHERE username = ?').get('testuser');
    expect(user.role).toBe('Player');
  });

  it('enforces unique username constraint', () => {
    db = createTestDb();
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('dupe', 'hash', 'Player');
    expect(() => {
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('dupe', 'hash2', 'Player');
    }).toThrow();
  });

  it('enforces role check constraint', () => {
    db = createTestDb();
    expect(() => {
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('bad', 'hash', 'Admin');
    }).toThrow();
  });

  it('createDb creates file database with WAL mode and users table', () => {
    const tmpDbPath = path.join('/tmp', `test-${Date.now()}.db`);
    try {
      db = createDb(tmpDbPath);
      const pragma = db.pragma('journal_mode');
      expect(pragma[0].journal_mode).toBe('wal');
      const columns = db.pragma('table_info(users)');
      expect(columns.length).toBe(5);
    } finally {
      if (db) {
        db.close();
        db = null;
      }
      if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
      if (fs.existsSync(`${tmpDbPath}-wal`)) fs.unlinkSync(`${tmpDbPath}-wal`);
      if (fs.existsSync(`${tmpDbPath}-shm`)) fs.unlinkSync(`${tmpDbPath}-shm`);
    }
  });

  it('preserves custom character_sheets sort_order across multiple createDb calls (server restart)', () => {
    const tmpDbPath = path.join('/tmp', `test-chars-reorder-${Date.now()}.db`);
    try {
      db = createDb(tmpDbPath);
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('gm', 'hash', 'GameMaster');
      db.prepare('INSERT INTO character_sheets (user_id, name, race, sort_order) VALUES (?, ?, ?, ?)').run(1, 'Alpha', 'Human', 1);
      db.prepare('INSERT INTO character_sheets (user_id, name, race, sort_order) VALUES (?, ?, ?, ?)').run(1, 'Beta', 'Vrusk', 2);
      db.prepare('INSERT INTO character_sheets (user_id, name, race, sort_order) VALUES (?, ?, ?, ?)').run(1, 'Gamma', 'Yazirian', 3);

      // Reorder: Gamma (0), Alpha (1), Beta (2)
      db.prepare('UPDATE character_sheets SET sort_order = 0 WHERE id = 3').run();
      db.prepare('UPDATE character_sheets SET sort_order = 1 WHERE id = 1').run();
      db.prepare('UPDATE character_sheets SET sort_order = 2 WHERE id = 2').run();

      const beforeRestart = db.prepare('SELECT id, name, sort_order FROM character_sheets ORDER BY sort_order ASC, id ASC').all();
      expect(beforeRestart.map(c => c.name)).toEqual(['Gamma', 'Alpha', 'Beta']);
      db.close();

      // Simulate server restart by reopening the database with createDb
      db = createDb(tmpDbPath);
      const afterRestart = db.prepare('SELECT id, name, sort_order FROM character_sheets ORDER BY sort_order ASC, id ASC').all();
      expect(afterRestart.map(c => c.name)).toEqual(['Gamma', 'Alpha', 'Beta']);
    } finally {
      if (db) {
        db.close();
        db = null;
      }
      if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
      if (fs.existsSync(`${tmpDbPath}-wal`)) fs.unlinkSync(`${tmpDbPath}-wal`);
      if (fs.existsSync(`${tmpDbPath}-shm`)) fs.unlinkSync(`${tmpDbPath}-shm`);
    }
  });

  it('preserves custom ship_sheets sort_order across multiple createDb calls (server restart)', () => {
    const tmpDbPath = path.join('/tmp', `test-ships-reorder-${Date.now()}.db`);
    try {
      db = createDb(tmpDbPath);
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('gm', 'hash', 'GameMaster');
      db.prepare('INSERT INTO ship_sheets (user_id, name, ship_type, sort_order) VALUES (?, ?, ?, ?)').run(1, 'Fighter', 'Fighter', 1);
      db.prepare('INSERT INTO ship_sheets (user_id, name, ship_type, sort_order) VALUES (?, ?, ?, ?)').run(1, 'Scout', 'Scout', 2);
      db.prepare('INSERT INTO ship_sheets (user_id, name, ship_type, sort_order) VALUES (?, ?, ?, ?)').run(1, 'Cruiser', 'Cruiser', 3);

      // Reorder: Cruiser (0), Fighter (1), Scout (2)
      db.prepare('UPDATE ship_sheets SET sort_order = 0 WHERE id = 3').run();
      db.prepare('UPDATE ship_sheets SET sort_order = 1 WHERE id = 1').run();
      db.prepare('UPDATE ship_sheets SET sort_order = 2 WHERE id = 2').run();

      const beforeRestart = db.prepare('SELECT id, name, sort_order FROM ship_sheets ORDER BY sort_order ASC, id ASC').all();
      expect(beforeRestart.map(s => s.name)).toEqual(['Cruiser', 'Fighter', 'Scout']);
      db.close();

      // Simulate server restart by reopening the database with createDb
      db = createDb(tmpDbPath);
      const afterRestart = db.prepare('SELECT id, name, sort_order FROM ship_sheets ORDER BY sort_order ASC, id ASC').all();
      expect(afterRestart.map(s => s.name)).toEqual(['Cruiser', 'Fighter', 'Scout']);
    } finally {
      if (db) {
        db.close();
        db = null;
      }
      if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
      if (fs.existsSync(`${tmpDbPath}-wal`)) fs.unlinkSync(`${tmpDbPath}-wal`);
      if (fs.existsSync(`${tmpDbPath}-shm`)) fs.unlinkSync(`${tmpDbPath}-shm`);
    }
  });
});

