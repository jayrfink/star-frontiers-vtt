import { Router } from 'express';
import bcrypt from 'bcrypt';
import { requireAuth, requireGM, isGameMaster } from './middleware.js';

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
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      if (userCount > 0) {
        if (!req.session || !req.session.userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        if (!isGameMaster(db, req.session.userId)) {
          return res.status(403).json({ error: 'GameMaster access required' });
        }
      }

      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      let role;
      if (userCount === 0) {
        role = 'GameMaster';
      } else {
        role = req.body.role || 'Player';
        if (!['GameMaster', 'Player'].includes(role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }
      }

      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = db.prepare(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
      ).run(username, passwordHash, role);

      res.status(201).json({
        id: Number(result.lastInsertRowid),
        username,
        role,
      });
    } catch (err) {
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

      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
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

  return router;
}
