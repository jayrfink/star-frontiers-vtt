import { Router } from 'express';
import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, requireGM, isGameMaster } from './middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SALT_ROUNDS = 12;

export function createAuthRouter(db) {
  const router = Router();

  router.get('/setup', (req, res) => {
    try {
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      res.json({ requiresSetup: userCount === 0 });
    } catch (err) {
      console.error('Setup status error:', err);
      res.status(500).json({ error: 'Failed to check setup status' });
    }
  });

  router.post('/register', async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const registerTx = db.transaction(() => {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        if (userCount > 0) {
          if (!req.session || !req.session.userId) {
            const err = new Error('Authentication required');
            err.status = 401;
            throw err;
          }
          if (!isGameMaster(db, req.session.userId)) {
            const err = new Error('GameMaster access required');
            err.status = 403;
            throw err;
          }
        }

        let role;
        if (userCount === 0) {
          role = 'GameMaster';
        } else {
          role = req.body.role || 'Player';
          if (!['GameMaster', 'Player'].includes(role)) {
            const err = new Error('Invalid role');
            err.status = 400;
            throw err;
          }
        }

        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
          const err = new Error('Username already exists');
          err.status = 409;
          throw err;
        }

        const result = db.prepare(
          'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
        ).run(username, passwordHash, role);

        return {
          id: Number(result.lastInsertRowid),
          username,
          role,
        };
      });

      const user = registerTx();
      res.status(201).json(user);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.post('/logout', requireAuth, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ ok: true });
    });
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json(user);
  });

  router.get('/users', requireGM(db), (req, res) => {
    try {
      const users = db.prepare('SELECT id, username, role FROM users ORDER BY id ASC').all();
      res.json(users);
    } catch (err) {
      console.error('Get users error:', err);
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  });

  router.delete('/users/:id', requireGM(db), (req, res) => {
    try {
      const targetUser = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (targetUser.role === 'GameMaster') {
        const gmCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'GameMaster'").get().count;
        if (gmCount <= 1) {
          return res.status(400).json({ error: 'Cannot delete the last GameMaster' });
        }
      }

      if (Number(targetUser.id) === Number(req.session.userId)) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

      const targetId = Number(targetUser.id);

      // Helper to purge sessions from a database connection with anchored JSON matching
      const purgeFromDb = (targetDb) => {
        try {
          const hasTable = targetDb.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sessions'").get();
          if (hasTable) {
            targetDb.prepare(`
              DELETE FROM sessions 
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
          }
        } catch {}
      };

      // 1. Invalidate via sessionStore purgeUser or db property if available
      if (req.sessionStore && typeof req.sessionStore.purgeUser === 'function') {
        req.sessionStore.purgeUser(targetId);
      } else if (req.sessionStore && req.sessionStore.db) {
        purgeFromDb(req.sessionStore.db);
      }

      // 2. Invalidate active sessions in sessions.db file on disk (if it exists)
      try {
        const sessionDir = req.app?.locals?.sessionDir;
        const sessionDbPath = sessionDir && sessionDir !== ':memory:'
          ? path.join(sessionDir, 'sessions.db')
          : (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'sessions.db') : path.resolve(__dirname, '../../data/sessions.db'));
        
        if (fs.existsSync(sessionDbPath)) {
          const storeDbName = req.sessionStore?.db?.name;
          if (!storeDbName || path.resolve(storeDbName) !== path.resolve(sessionDbPath)) {
            const sessDb = new Database(sessionDbPath);
            try {
              purgeFromDb(sessDb);
            } finally {
              sessDb.close();
            }
          }
        }
      } catch (err) {
        console.error('Error purging sessions.db:', err);
      }

      // 3. Keep fallback purge in app.db (for in-memory test setups where sessions table is created in app.db)
      purgeFromDb(db);

      // 4. MemoryStore or standard sessionStore iteration
      if (req.sessionStore && typeof req.sessionStore.all === 'function') {
        req.sessionStore.all((err, sessions) => {
          if (!err && sessions) {
            for (const [sid, sess] of Object.entries(sessions)) {
              if (sess && (sess.userId === targetId || sess.userId === String(targetId) || Number(sess.userId) === targetId)) {
                req.sessionStore.destroy(sid, () => {});
              }
            }
          }
        });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  router.put('/users/:id/password', requireGM(db), async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error('Update password error:', err);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  router.put('/password', async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
      const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const matches = await bcrypt.compare(currentPassword, user.password_hash);
      if (!matches) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.session.userId);
      res.json({ ok: true, message: 'Password updated successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  return router;
}
