import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;

if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}

export const config = {
  env: env.NODE_ENV || 'development',
  port: Number(env.PORT || 4000),
  dbFile: env.DB_FILE || path.join(root, 'data', 'jalingo.db'),
  // In development a random secret is fine (tokens die on restart). Set JWT_SECRET to keep sessions.
  jwtSecret: env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  tokenTtlSeconds: Number(env.TOKEN_TTL_SECONDS || 60 * 60 * 12),
  // Comma-separated list of allowed browser origins. Empty = same-origin only (plus localhost in dev).
  corsOrigins: (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  // Password given to the seeded demo accounts. Change it, or delete the accounts, before going live.
  demoPassword: env.DEMO_PASSWORD || 'ChangeMe!123',
  // Optional built front-ends to serve from this process (npm run build in each app).
  staticDirs: {
    club: env.CLUB_DIST || path.resolve(root, '../apps/club-web/dist'),
    league: env.LEAGUE_DIST || path.resolve(root, '../apps/league-web/dist')
  },
  root
};
