import { Router } from 'express';
import bcrypt from 'bcrypt';
import { requireAuth } from './middleware.js';

const SALT_ROUNDS = 12;

export function createAuthRouter(db) {
  const router = Router();

  router.post('/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      const role = userCount === 0 ? 'GameMaster' : 'Player';

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

  return router;
}
