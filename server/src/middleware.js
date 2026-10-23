import session from 'express-session';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ONE_DAY = 24 * 60 * 60 * 1000;

export class BetterSqlite3Store extends session.Store {
  constructor(options = {}) {
    super(options);
    this.table = options.table || 'sessions';

    if (options.client) {
      this.db = options.client;
    } else {
      const dir = options.dir || (options.path ? path.dirname(options.path) : null);
      if (dir && dir !== ':memory:' && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const dbPath = options.path || (
        options.dir ? path.join(options.dir, options.db || 'sessions.db') : (options.db || 'sessions.db')
      );
      this.db = new Database(dbPath);
    }

    try {
      this.db.pragma('journal_mode = WAL');
    } catch {}

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        sid TEXT PRIMARY KEY,
        expired INTEGER NOT NULL,
        sess TEXT NOT NULL
      )
    `);

    const cleanupInterval = options.cleanupInterval !== undefined ? options.cleanupInterval : ONE_DAY;
    if (cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, cleanupInterval).unref();
    }
  }

  cleanup() {
    try {
      const now = Date.now();
      this.db.prepare(`DELETE FROM ${this.table} WHERE expired < ?`).run(now);
    } catch {}
  }

  get(sid, fn) {
    try {
      const now = Date.now();
      const row = this.db.prepare(`SELECT sess, expired FROM ${this.table} WHERE sid = ?`).get(sid);
      if (!row) {
        return fn ? fn(null, null) : null;
      }
      if (row.expired && row.expired < now) {
        this.destroy(sid, () => {});
        return fn ? fn(null, null) : null;
      }
      const data = JSON.parse(row.sess);
      return fn ? fn(null, data) : data;
    } catch (err) {
      if (fn) return fn(err);
      throw err;
    }
  }

  set(sid, sess, fn) {
    try {
      const maxAge = sess?.cookie?.maxAge;
      const now = Date.now();
      const expired = (typeof maxAge === 'number')
        ? now + maxAge
        : (sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : now + ONE_DAY);
      const sessStr = JSON.stringify(sess);

      this.db.prepare(`
        INSERT INTO ${this.table} (sid, expired, sess)
        VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET expired = excluded.expired, sess = excluded.sess
      `).run(sid, expired, sessStr);

      if (fn) fn(null);
    } catch (err) {
      if (fn) fn(err);
      else throw err;
    }
  }

  destroy(sid, fn) {
    try {
      this.db.prepare(`DELETE FROM ${this.table} WHERE sid = ?`).run(sid);
      if (fn) fn(null);
    } catch (err) {
      if (fn) fn(err);
      else throw err;
    }
  }

  touch(sid, sess, fn) {
    try {
      const maxAge = sess?.cookie?.maxAge;
      const now = Date.now();
      const expired = (typeof maxAge === 'number')
        ? now + maxAge
        : (sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : now + ONE_DAY);
      this.db.prepare(`UPDATE ${this.table} SET expired = ? WHERE sid = ?`).run(expired, sid);
      if (fn) fn(null);
    } catch (err) {
      if (fn) fn(err);
      else throw err;
    }
  }

  all(fn) {
    try {
      const now = Date.now();
      const rows = this.db.prepare(`SELECT sid, sess, expired FROM ${this.table}`).all();
      const result = {};
      for (const row of rows) {
        if (!row.expired || row.expired >= now) {
          try {
            result[row.sid] = JSON.parse(row.sess);
          } catch {}
        }
      }
      if (fn) fn(null, result);
      return result;
    } catch (err) {
      if (fn) fn(err);
      else throw err;
    }
  }

  length(fn) {
    try {
      const now = Date.now();
      const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.table} WHERE expired >= ?`).get(now).count;
      if (fn) fn(null, count);
      return count;
    } catch (err) {
      if (fn) fn(err);
      else throw err;
    }
  }

  clear(fn) {
    try {
      this.db.prepare(`DELETE FROM ${this.table}`).run();
      if (fn) fn(null);
    } catch (err) {
      if (fn) fn(err);
      else throw err;
    }
  }

  purgeUser(userId) {
    try {
      const targetId = Number(userId);
      this.db.prepare(`
        DELETE FROM ${this.table}
        WHERE (json_valid(sess) AND (json_extract(sess, '$.userId') = ? OR json_extract(sess, '$.userId') = ?))
           OR sess LIKE ? OR sess LIKE ? OR sess LIKE ? OR sess LIKE ?
      `).run(
        targetId,
        String(targetId),
        `%"userId":${targetId},%`,
        `%"userId":${targetId}}%`,
        `%"userId":"${targetId}",%`,
        `%"userId":"${targetId}"}%`
      );
    } catch {}
  }

  close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.db && typeof this.db.close === 'function') {
      try {
        this.db.close();
      } catch {}
    }
  }
}

export function createSessionMiddleware(dataDir) {
  let store;
  if (dataDir === ':memory:') {
    store = new session.MemoryStore();
  } else {
    const dir = dataDir || path.join(__dirname, '../../data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    store = new BetterSqlite3Store({
      db: 'sessions.db',
      dir,
    });
  }
  return session({
    store,
    secret: process.env.SESSION_SECRET || 'sf-vtt-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  });
}

export function requireAuth(reqOrDb, res, next) {
  if (typeof next === 'function') {
    const req = reqOrDb;
    if (req.session && req.session.userId) {
      const db = req.db || req.app?.locals?.db;
      if (db) {
        const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.session.userId);
        if (!user) {
          if (req.session.destroy) {
            req.session.destroy(() => {});
          }
          return res.status(401).json({ error: 'Authentication required' });
        }
      }
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  } else {
    const db = reqOrDb;
    return (req, resInner, nextInner) => {
      if (req.session && req.session.userId) {
        const activeDb = db || req.db || req.app?.locals?.db;
        if (activeDb) {
          const user = activeDb.prepare('SELECT id, role FROM users WHERE id = ?').get(req.session.userId);
          if (!user) {
            if (req.session.destroy) {
              req.session.destroy(() => {});
            }
            return resInner.status(401).json({ error: 'Authentication required' });
          }
        }
        return nextInner();
      }
      return resInner.status(401).json({ error: 'Authentication required' });
    };
  }
}

export function isGameMaster(db, userId) {
  if (!userId) return false;
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  return user && user.role === 'GameMaster';
}

export function requireGM(db) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isGameMaster(db, req.session.userId)) {
      return res.status(403).json({ error: 'GameMaster access required' });
    }
    next();
  };
}

