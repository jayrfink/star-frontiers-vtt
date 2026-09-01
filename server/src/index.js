import express from 'express';
import cors from 'cors';
import { createDb } from './db.js';
import { createSessionMiddleware } from './middleware.js';
import { createAuthRouter } from './auth.js';

export function createApp(db) {
  const app = express();

  app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true,
  }));
  app.use(express.json());
  app.use(createSessionMiddleware());
  app.use('/api/auth', createAuthRouter(db));

  return app;
}

// Start server when run directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  const db = createDb();
  const app = createApp(db);
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Star Frontiers VTT server running on port ${PORT}`);
  });
}
