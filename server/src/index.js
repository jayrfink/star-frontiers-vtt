import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import compression from 'compression';
import { createDb } from './db.js';
import { createSessionMiddleware, isGameMaster } from './middleware.js';
import { createAuthRouter } from './auth.js';
import { createRulebooksRouter } from './rulebooks.js';
import { createCharacterRouter, createShipRouter } from './sheets.js';
import { createMapRouter, createTokenRouter } from './maps.js';
import { createUploadRouter } from './upload.js';
import { createRollRouter } from './rolls.js';
import { createAdversariesRouter } from './adversaries.js';
import { createVehiclesRouter } from './vehicles.js';
import { createGmNotesRouter } from './gmNotes.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, '../../data/uploads');

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function getAllowedOrigins() {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS);
  if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(',').forEach((o) => {
      const trimmed = o.trim().replace(/\/+$/, '');
      if (trimmed) origins.add(trimmed);
    });
  }
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
      const trimmed = o.trim().replace(/\/+$/, '');
      if (trimmed) origins.add(trimmed);
    });
  }
  return origins;
}

export function isPrivateNetworkOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local')
    ) {
      return true;
    }

    // Check RFC 1918 private IPv4 ranges and link-local:
    // 10.0.0.0/8
    // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    // 192.168.0.0/16
    // 169.254.0.0/16
    // 127.0.0.0/8
    const ipv4Parts = hostname.split('.').map(Number);
    if (ipv4Parts.length === 4 && ipv4Parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      const [a, b] = ipv4Parts;
      if (a === 10) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 169 && b === 254) return true;
      if (a === 127) return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function isOriginAllowed(origin) {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/+$/, '');
  const allowed = getAllowedOrigins();
  if (allowed.has('*') || allowed.has(normalizedOrigin)) {
    return true;
  }
  return isPrivateNetworkOrigin(normalizedOrigin);
}

export function createApp(db, sessionDir, uploadDir) {
  const app = express();
  const server = http.createServer(app);

  const corsOptions = {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  };

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS'));
        }
      },
      credentials: true,
    },
  });

  const uploadsPath = uploadDir || DEFAULT_UPLOADS_DIR;
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  const sessionMiddleware = createSessionMiddleware(sessionDir);

  io.use((socket, next) => {
    const mockRes = {
      setHeader: () => {},
      getHeader: () => undefined,
      writeHead: () => mockRes,
      end: () => mockRes,
      write: () => true,
      _implicitHeader: () => {},
    };

    sessionMiddleware(socket.request, mockRes, () => {
      const session = socket.request.session;
      if (session && session.userId) {
        return next();
      }
      try {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0;
        if (userCount === 0) {
          return next();
        }
      } catch {}
      return next(new Error('Authentication required'));
    });
  });

  io.on('connection', (socket) => {
    const session = socket.request?.session;
    if (session?.userId && isGameMaster(db, session.userId)) {
      socket.join('role:GameMaster');
    }
  });

  app.locals.db = db;
  app.locals.sessionDir = sessionDir;

  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use((req, _res, next) => {
    req.db = db;
    next();
  });
  app.use(
    '/uploads',
    express.static(uploadsPath, {
      maxAge: '1d',
      etag: true,
      lastModified: true,
    })
  );
  app.use('/api/upload', createUploadRouter(uploadsPath, db, io));
  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/rulebooks', createRulebooksRouter());
  app.use('/api/characters', createCharacterRouter(db, io));
  app.use('/api/ships', createShipRouter(db, io));
  app.use('/api/ship-sheets', createShipRouter(db, io));
  app.use('/api/maps', createMapRouter(db, io));
  app.use('/api/tokens', createTokenRouter(db, io));
  app.use('/api/rolls', createRollRouter(db, io));
  app.use('/api/adversaries', createAdversariesRouter(db, io, uploadsPath));
  app.use('/api/vehicles', createVehiclesRouter(db, io));
  app.use('/api/gm-notes', createGmNotesRouter(db));

// Equipment Route
app.get('/api/equipment', (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../../data/inventory_items.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Equipment list not found' });
  }
});

  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(
      express.static(clientDistPath, {
        maxAge: '1h',
        etag: true,
      })
    );

    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/socket.io')
      ) {
        return next();
      }
      if (!req.accepts('html')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }


  return { app, server, io };
}

// Start server when run directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  const db = createDb();
  const { server } = createApp(db);
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Star Frontiers VTT server running on port ${PORT}`);
  });
}
