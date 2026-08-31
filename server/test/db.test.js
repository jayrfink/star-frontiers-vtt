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
});
