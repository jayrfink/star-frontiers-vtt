import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SQLiteStore = connectSqlite3(session);

export function createSessionMiddleware(dataDir) {
  let store;
  if (dataDir === ':memory:') {
    store = new session.MemoryStore();
  } else {
    const dir = dataDir || path.join(__dirname, '../../data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    store = new SQLiteStore({
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

export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}
