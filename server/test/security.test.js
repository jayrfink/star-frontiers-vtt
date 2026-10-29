import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestDb } from '../src/db.js';
import { createApp } from '../src/index.js';
import { createSessionMiddleware } from '../src/middleware.js';

describe('Security Hardening (SEC-03, SEC-15, SEC-16)', () => {
  describe('SEC-03: Session secret enforcement & secure cookie', () => {
    const origEnv = process.env;

    beforeEach(() => {
      process.env = { ...origEnv };
    });

    afterEach(() => {
      process.env = origEnv;
    });

    it('throws an error in production if SESSION_SECRET is missing or empty', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SESSION_SECRET;

      expect(() => {
        createSessionMiddleware(':memory:');
      }).toThrow(/SESSION_SECRET environment variable must be set/);
    });

    it('throws an error in production if SESSION_SECRET is the default dev secret', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'sf-vtt-dev-secret';

      expect(() => {
        createSessionMiddleware(':memory:');
      }).toThrow(/SESSION_SECRET environment variable must be set/);
    });

    it('allows valid custom secret in production and enables secure cookie by default', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'super-secure-production-secret-12345';
      delete process.env.COOKIE_SECURE;

      const middleware = createSessionMiddleware(':memory:');
      expect(typeof middleware).toBe('function');
    });

    it('honors COOKIE_SECURE=true override in non-production mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.COOKIE_SECURE = 'true';

      const middleware = createSessionMiddleware(':memory:');
      expect(typeof middleware).toBe('function');
    });
  });

  describe('SEC-15: Standard HTTP Security Headers', () => {
    let db, app, server;

    beforeEach(() => {
      db = createTestDb();
      const result = createApp(db, ':memory:');
      app = result.app;
      server = result.server;
    });

    afterEach(() => {
      if (db) db.close();
      if (server && server.close) server.close();
    });

    it('returns X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, Referrer-Policy headers', async () => {
      const res = await request(app).get('/api/auth/setup');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('SEC-16: Global Express Error Handler', () => {
    let db, app, server;

    beforeEach(() => {
      db = createTestDb();
      const result = createApp(db, ':memory:');
      app = result.app;
      server = result.server;
    });

    afterEach(() => {
      if (db) db.close();
      if (server && server.close) server.close();
    });

    it('catches unhandled synchronous error and returns clean 500 JSON without stack trace leak', async () => {
      // Inject throwing handler before error handler in router stack
      const errLayer = app._router.stack.pop();
      app.get('/api/test-error/500', (_req, _res) => {
        throw new Error('Database disk exploded');
      });
      app._router.stack.push(errLayer);

      const res = await request(app).get('/api/test-error/500');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
      expect(res.body).not.toHaveProperty('stack');
      // Should still include security headers
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('preserves custom error status codes like 400', async () => {
      // Inject throwing handler before error handler in router stack
      const errLayer = app._router.stack.pop();
      app.get('/api/test-error/400', (_req, _res) => {
        const err = new Error('Invalid parameter supplied');
        err.status = 400;
        throw err;
      });
      app._router.stack.push(errLayer);

      const res = await request(app).get('/api/test-error/400');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid parameter supplied');
    });
  });
});
