import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const badRequest = (m, d) => new HttpError(400, m, d);
export const unauthorized = (m = 'Sign in required') => new HttpError(401, m);
export const forbidden = (m = 'You do not have permission to do that') => new HttpError(403, m);
export const notFound = (m = 'Not found') => new HttpError(404, m);
export const conflict = (m, d) => new HttpError(409, m, d);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain' };

/** A very small router: app.get('/api/x/:id', handler). Handlers receive ctx = { req, res, params, query, body, user, url }. */
export function createApp() {
  const routes = [];
  const add = (method) => (pattern, ...handlers) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\/:([A-Za-z0-9_]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
    routes.push({ method, re, keys, handlers });
  };
  const app = { get: add('GET'), post: add('POST'), put: add('PUT'), patch: add('PATCH'), delete: add('DELETE'), hooks: { authenticate: null }, static: [] };

  async function readBody(req) {
    if (['GET', 'HEAD', 'DELETE'].includes(req.method)) return undefined;
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > 1_000_000) throw new HttpError(413, 'Request body too large'); chunks.push(c); }
    if (!chunks.length) return {};
    const raw = Buffer.concat(chunks).toString('utf8');
    try { return JSON.parse(raw); } catch { throw badRequest('Body must be valid JSON'); }
  }

  // function cors(req, res) {
  //   const origin = req.headers.origin;
  //   if (!origin) return;
  //   const allowed = config.corsOrigins.includes(origin) || (config.env !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  //   if (allowed) {
  //     res.setHeader('Access-Control-Allow-Origin', origin);
  //     res.setHeader('Vary', 'Origin');
  //     res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  //     res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  //   }
  // }

  function cors(req, res) {
    const origin = req.headers.origin;
    if (!origin) return false;

    const allowed =
      config.corsOrigins.includes(origin) ||
      (config.env !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

    console.log({ incomingOrigin: origin, allowedList: config.corsOrigins });
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    }

    // Handle browser preflight requests immediately
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return true; // Tells your main router to stop processing this request
    }

    return false;
  }

  function send(res, status, payload) {
    const body = payload === undefined ? '' : JSON.stringify(payload);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end(body);
  }

  function serveStatic(urlPath, res) {
    for (const { prefix, dir } of app.static) {
      if (urlPath !== prefix && !urlPath.startsWith(prefix + '/')) continue;
      if (!fs.existsSync(dir)) continue;
      const rel = decodeURIComponent(urlPath.slice(prefix.length)) || '/';
      let file = path.join(dir, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(dir)) continue;
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html'); // SPA fallback
      if (!fs.existsSync(file)) continue;
      const ext = path.extname(file).toLowerCase();
      const immutable = file.includes(`${path.sep}assets${path.sep}`);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
      fs.createReadStream(file).pipe(res);
      return true;
    }
    return false;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    cors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    try {
      if (!url.pathname.startsWith('/api/')) {
        if (req.method === 'GET' && serveStatic(url.pathname, res)) return;
        return send(res, 404, { error: 'Not found' });
      }
      const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
      if (!route) {
        const other = routes.some((r) => r.re.test(url.pathname));
        throw new HttpError(other ? 405 : 404, other ? 'Method not allowed' : 'Not found');
      }
      const m = url.pathname.match(route.re);
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const ctx = { req, res, url, params, query: Object.fromEntries(url.searchParams), body: await readBody(req), user: null };
      if (app.hooks.authenticate) ctx.user = app.hooks.authenticate(req);
      let result;
      for (const h of route.handlers) { result = await h(ctx); if (res.writableEnded) return; }
      send(res, result === undefined ? 204 : 200, result);
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message, ...(err.details ? { details: err.details } : {}) });
      console.error(err);
      send(res, 500, { error: 'Something went wrong on our side.' });
    }
  });
  app.server = server;
  app.listen = (port) => new Promise((resolve) => server.listen(port, () => resolve(server)));
  return app;
}

/* ---------- tiny validator ----------
   schema: { field: 'string' | 'string?' | 'number' | 'boolean' | 'email' | 'date' | 'time' | ['a','b'] (enum) | {min,max,minLen,maxLen,type,optional} } */
export function validate(body, schema) {
  const errors = {}, out = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Send a JSON object.');
  for (const [key, spec0] of Object.entries(schema)) {
    let spec = typeof spec0 === 'string' ? { type: spec0.replace('?', ''), optional: spec0.endsWith('?') } : Array.isArray(spec0) ? { type: 'enum', values: spec0 } : spec0;
    const v = body[key];
    if (v === undefined || v === null || v === '') { if (!spec.optional) errors[key] = 'This field is required.'; continue; }
    switch (spec.type) {
      case 'string': if (typeof v !== 'string') errors[key] = 'Must be text.'; else { const s = v.trim(); if (spec.minLen && s.length < spec.minLen) errors[key] = `Use at least ${spec.minLen} characters.`; else if (s.length > (spec.maxLen || 5000)) errors[key] = 'Too long.'; else out[key] = s; } break;
      case 'email': if (typeof v !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) errors[key] = 'Enter a valid email address.'; else out[key] = v.trim().toLowerCase(); break;
      case 'number': { const n = Number(v); if (!Number.isFinite(n)) errors[key] = 'Must be a number.'; else if (spec.min !== undefined && n < spec.min) errors[key] = `Must be at least ${spec.min}.`; else if (spec.max !== undefined && n > spec.max) errors[key] = `Must be at most ${spec.max}.`; else out[key] = n; break; }
      case 'boolean': out[key] = v === true || v === 'true'; break;
      case 'date': if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) errors[key] = 'Use a date like 2026-12-31.'; else out[key] = v; break;
      case 'time': if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) errors[key] = 'Use a time like 14:30.'; else out[key] = v; break;
      case 'enum': if (!spec.values.includes(v)) errors[key] = `Must be one of: ${spec.values.join(', ')}.`; else out[key] = v; break;
      case 'any': out[key] = v; break;
      default: out[key] = v;
    }
  }
  if (Object.keys(errors).length) throw badRequest('Please correct the highlighted fields.', errors);
  return out;
}
