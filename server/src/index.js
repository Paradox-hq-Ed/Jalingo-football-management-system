import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from './config.js';
import { openDb, createStores } from './db.js';
import { createApp } from './http.js';
import { authenticate } from './auth.js';
import { seedAll } from './seed/index.js';
import { mountAuth } from './routes/auth.js';
import { mountClub } from './routes/club.js';
import { mountLeague } from './routes/league.js';

export async function buildApp({ dbFile, seed = false } = {}) {
  const stores = createStores(openDb(dbFile));
  if (seed) await seedAll(stores);
  const app = createApp();
  app.hooks.authenticate = authenticate;
  app.get('/api/health', () => ({ ok: true, time: new Date().toISOString() }));
  mountAuth(app, stores);
  mountClub(app, stores);
  mountLeague(app, stores);
  // Optional: serve the built front-ends from this process (club at /, league at /league).
  app.static.push({ prefix: '/league', dir: config.staticDirs.league }, { prefix: '', dir: config.staticDirs.club });
  return { app, stores };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const { app, stores } = await buildApp({ seed: config.env !== 'production' || process.env.SEED_ON_START === '1' });
  await app.listen(config.port);
  console.log(`Jalingo API listening on http://localhost:${config.port}  (db: ${config.dbFile})`);
  const stop = () => { app.server.close(() => { stores.db.close(); process.exit(0); }); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}