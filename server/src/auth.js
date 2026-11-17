import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { config } from './config.js';
import { forbidden, unauthorized } from './http.js';

const scrypt = promisify(crypto.scrypt);
const b64 = (b) => Buffer.from(b).toString('base64url');

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}
export async function verifyPassword(password, stored) {
  const [alg, salt, key] = String(stored).split('$');
  if (alg !== 'scrypt' || !salt || !key) return false;
  const derived = await scrypt(password, Buffer.from(salt, 'base64url'), 64);
  const expected = Buffer.from(key, 'base64url');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

/* HS256 JSON Web Token, implemented with node:crypto so the server needs no dependencies. */
export function signToken(payload, ttl = config.tokenTtlSeconds) {
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttl }));
  const sig = crypto.createHmac('sha256', config.jwtSecret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}
export function verifyToken(token) {
  const [h, b, s] = String(token).split('.');
  if (!h || !b || !s) return null;
  const expected = crypto.createHmac('sha256', config.jwtSecret).update(`${h}.${b}`).digest();
  const given = Buffer.from(s, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8'));
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch { return null; }
}

export function authenticate(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return null;
  const p = verifyToken(m[1]);
  return p ? { id: p.sub, role: p.role, name: p.name, scope: p.scope || {} } : null;
}

/** Route guards. Roles per product:
 *  club:   club_admin
 *  league: admin | team | coach | player | referee | media | sponsor */
export const requireUser = (ctx) => { if (!ctx.user) throw unauthorized(); };
export const requireRole = (...roles) => (ctx) => {
  if (!ctx.user) throw unauthorized();
  if (!roles.includes(ctx.user.role)) throw forbidden();
};

/* Naive in-memory rate limiter for login and public forms. Use a shared store (Redis) if you run several instances. */
const hits = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) return false;
  list.push(now); hits.set(key, list);
  return true;
}
