import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createApp, isOriginAllowed, isPrivateNetworkOrigin } from '../src/index.js';
import { createDb } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('LAN Network Performance & CORS Origin Validation', () => {
  let db;
  let app;
  let tempUploadDir;
  let tempSessionDir;

  beforeEach(() => {
    db = createDb(':memory:');
    tempUploadDir = path.join(__dirname, 'fixtures', `temp_perf_upload_${Date.now()}`);
    tempSessionDir = path.join(__dirname, 'fixtures', `temp_perf_session_${Date.now()}`);
    fs.mkdirSync(tempUploadDir, { recursive: true });
    fs.mkdirSync(tempSessionDir, { recursive: true });
    const created = createApp(db, tempSessionDir, tempUploadDir);
    app = created.app;
  });

  afterEach(() => {
    try {
      fs.rmSync(tempUploadDir, { recursive: true, force: true });
      fs.rmSync(tempSessionDir, { recursive: true, force: true });
    } catch {}
    if (db) db.close();
  });

  describe('isPrivateNetworkOrigin & isOriginAllowed', () => {
    it('allows localhost and loopback IPv4/IPv6', () => {
      expect(isPrivateNetworkOrigin('http://localhost:3000')).toBe(true);
      expect(isPrivateNetworkOrigin('http://localhost:3001')).toBe(true);
      expect(isPrivateNetworkOrigin('http://127.0.0.1:3001')).toBe(true);
      expect(isPrivateNetworkOrigin('http://[::1]:3000')).toBe(true);
      expect(isOriginAllowed('http://localhost:3001')).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(true);
    });

    it('allows RFC 1918 private IPv4 ranges on any port', () => {
      // 10.0.0.0/8
      expect(isOriginAllowed('http://10.0.0.15:3001')).toBe(true);
      expect(isOriginAllowed('http://10.254.1.1:3000')).toBe(true);

      // 172.16.0.0/12 (172.16 - 172.31)
      expect(isOriginAllowed('http://172.16.0.1:3001')).toBe(true);
      expect(isOriginAllowed('http://172.24.10.50:3000')).toBe(true);
      expect(isOriginAllowed('http://172.31.255.254:3001')).toBe(true);

      // 192.168.0.0/16
      expect(isOriginAllowed('http://192.168.1.1:3001')).toBe(true);
      expect(isOriginAllowed('http://192.168.1.150:3001')).toBe(true);
      expect(isOriginAllowed('http://192.168.0.254:3000')).toBe(true);

      // 169.254.0.0/16 link-local
      expect(isOriginAllowed('http://169.254.10.20:3001')).toBe(true);
    });

    it('allows .local mDNS hostnames on LAN', () => {
      expect(isOriginAllowed('http://game-master-mac.local:3001')).toBe(true);
      expect(isOriginAllowed('http://desktop.local:3000')).toBe(true);
    });

    it('rejects public untrusted domains and non-private IPs', () => {
      expect(isOriginAllowed('http://evil.com')).toBe(false);
      expect(isOriginAllowed('http://attacker.org:3000')).toBe(false);
      expect(isOriginAllowed('http://8.8.8.8:3001')).toBe(false);
      expect(isOriginAllowed('http://172.32.0.1:3001')).toBe(false);
      expect(isOriginAllowed('http://172.15.255.255:3001')).toBe(false);
      expect(isOriginAllowed('http://192.169.1.1:3001')).toBe(false);
    });
  });

  describe('CORS and Compression over LAN', () => {
    it('sets CORS headers for LAN origin', async () => {
      const res = await request(app)
        .get('/api/auth/setup')
        .set('Origin', 'http://192.168.1.150:3001');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://192.168.1.150:3001');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('serves compressed responses when requested with Accept-Encoding: gzip', async () => {
      const res = await request(app)
        .get('/api/equipment')
        .set('Accept-Encoding', 'gzip');

      expect(res.status).toBe(200);
      expect(res.headers['content-encoding']).toBe('gzip');
    });

    it('sets cache headers on static uploads', async () => {
      const testFile = path.join(tempUploadDir, 'cached_test.txt');
      fs.writeFileSync(testFile, 'hello cache test');

      const res = await request(app).get('/uploads/cached_test.txt');
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toContain('max-age=86400');
    });
  });
});
