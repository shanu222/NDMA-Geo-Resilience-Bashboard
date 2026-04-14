import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import { WebSocketServer } from 'ws';
import { registerRoutes } from './routes.js';
import { runMigrations } from './migrate.js';
import { seedIfEmpty } from './seed.js';
import { syncOpenWeather } from './services/weatherService.js';
import { setWss } from './realtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');
const distDir = path.join(rootDir, 'dist');
const uploadsDir = path.join(__dirname, '..', 'uploads');

async function main() {
  await fs.mkdir(uploadsDir, { recursive: true });

  if (!process.env.DATABASE_URL) {
    console.warn('[ndma-api] DATABASE_URL not set — API will fail DB operations until configured.');
  } else {
    await runMigrations();
    await seedIfEmpty();
  }

  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '4mb' }));
  app.use('/uploads', express.static(uploadsDir));

  registerRoutes(app);

  if ((await fs.stat(distDir).catch(() => null))?.isDirectory()) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3001);
  const server = http.createServer(app);

  const wss = new WebSocketServer({ server, path: '/ws' });
  setWss(wss);

  cron.schedule('*/7 * * * *', () => {
    syncOpenWeather().catch((e) => console.error('[weather]', e));
  });

  server.listen(port, () => {
    console.log(`[ndma-api] listening on :${port}`);
    syncOpenWeather().catch((e) => console.error('[weather:init]', e));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
