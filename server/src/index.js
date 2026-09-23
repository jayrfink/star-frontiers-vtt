import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createDb } from './db.js';
import { createSessionMiddleware } from './middleware.js';
import { createAuthRouter } from './auth.js';
import { createRulebooksRouter } from './rulebooks.js';
import { createCharacterRouter, createShipRouter } from './sheets.js';
import { createMapRouter, createTokenRouter } from './maps.js';
import { createUploadRouter } from './upload.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, '../../data/uploads');

export function createApp(db, sessionDir, uploadDir) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  const uploadsPath = uploadDir || DEFAULT_UPLOADS_DIR;
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json());
  app.use(createSessionMiddleware(sessionDir));
  app.use('/uploads', express.static(uploadsPath));
  app.use('/api/upload', createUploadRouter(uploadsPath));
  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/rulebooks', createRulebooksRouter());
  app.use('/api/characters', createCharacterRouter(db, io));
  app.use('/api/ships', createShipRouter(db, io));
  app.use('/api/maps', createMapRouter(db, io));
  app.use('/api/tokens', createTokenRouter(db, io));

// Equipment Route
app.get('/api/equipment', (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, '../../data/inventory_items.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Equipment list not found' });
  }
});


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
