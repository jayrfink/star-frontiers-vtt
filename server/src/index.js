import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createDb } from './db.js';
import { createSessionMiddleware } from './middleware.js';
import { createAuthRouter } from './auth.js';
import { createRulebooksRouter } from './rulebooks.js';
import { createCharacterRouter, createShipRouter } from './sheets.js';

export function createApp(db, sessionDir) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3001',
      credentials: true,
    },
  });

  app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
  }));
  app.use(express.json());
  app.use(createSessionMiddleware(sessionDir));
  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/rulebooks', createRulebooksRouter());
  app.use('/api/characters', createCharacterRouter(db, io));
  app.use('/api/ships', createShipRouter(db, io));

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
