import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

/* ----------------------------------------------------------------------------
   Storage model
   Every entity lives in its own table with:
     id      TEXT PRIMARY KEY
     <cols>  denormalised copies of the fields we filter or join on (indexed)
     data    the full record as JSON
   This keeps the schema small while still giving real indexes and foreign-key-like
   lookups. Swapping to Postgres later only means re-implementing this file.
   -------------------------------------------------------------------------- */

export function openDb(file = config.dbFile) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL;');
  return db;
}

const q = (s) => `"${String(s).replace(/"/g, '""')}"`;

export class Repo {
  constructor(db, table, cols = [], { orderBy = 'id' } = {}) {
    this.db = db; this.table = table; this.cols = cols; this.orderBy = orderBy;
    db.exec(`CREATE TABLE IF NOT EXISTS ${q(table)} (id TEXT PRIMARY KEY, ${cols.map((c) => `${q(c)} TEXT`).join(', ')}${cols.length ? ',' : ''} data TEXT NOT NULL)`);
    cols.forEach((c) => db.exec(`CREATE INDEX IF NOT EXISTS ${q(`${table}_${c}`)} ON ${q(table)} (${q(c)})`));
  }

  #params(obj) {
    return [obj.id, ...this.cols.map((c) => (obj[c] === undefined || obj[c] === null ? null : String(obj[c]))), JSON.stringify(obj)];
  }

  /** where: { col: value | [values] } (only indexed columns); opts: { orderBy, desc, limit, offset } */
  all(where = {}, opts = {}) {
    const clauses = [], params = [];
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      if (k !== 'id' && !this.cols.includes(k)) throw new Error(`${this.table}: "${k}" is not an indexed column`);
      if (Array.isArray(v)) { clauses.push(`${q(k)} IN (${v.map(() => '?').join(',') || 'NULL'})`); params.push(...v.map(String)); }
      else if (v === null) clauses.push(`${q(k)} IS NULL`);
      else { clauses.push(`${q(k)} = ?`); params.push(String(v)); }
    }
    const order = opts.orderBy || this.orderBy;
    const sql = `SELECT data FROM ${q(this.table)}${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY ${q(order)}${opts.desc ? ' DESC' : ''}${opts.limit ? ` LIMIT ${Number(opts.limit)} OFFSET ${Number(opts.offset || 0)}` : ''}`;
    return this.db.prepare(sql).all(...params).map((r) => JSON.parse(r.data));
  }

  get(id) {
    const r = this.db.prepare(`SELECT data FROM ${q(this.table)} WHERE id = ?`).get(String(id));
    return r ? JSON.parse(r.data) : null;
  }

  count(where = {}) { return this.all(where).length; }

  insert(obj) {
    if (!obj.id) throw new Error(`${this.table}: record needs an id`);
    this.db.prepare(`INSERT INTO ${q(this.table)} (id, ${this.cols.map(q).join(', ')}${this.cols.length ? ',' : ''} data) VALUES (${['?', ...this.cols.map(() => '?'), '?'].join(',')})`).run(...this.#params(obj));
    return obj;
  }

  save(obj) { // upsert
    this.db.prepare(`INSERT OR REPLACE INTO ${q(this.table)} (id, ${this.cols.map(q).join(', ')}${this.cols.length ? ',' : ''} data) VALUES (${['?', ...this.cols.map(() => '?'), '?'].join(',')})`).run(...this.#params(obj));
    return obj;
  }

  update(id, patch) {
    const cur = this.get(id);
    if (!cur) return null;
    return this.save({ ...cur, ...patch, id: cur.id });
  }

  delete(id) { return this.db.prepare(`DELETE FROM ${q(this.table)} WHERE id = ?`).run(String(id)).changes > 0; }
  clear() { this.db.exec(`DELETE FROM ${q(this.table)}`); }
}

/** Single-document store for config-like records. */
export class Docs {
  constructor(db) {
    this.db = db;
    db.exec('CREATE TABLE IF NOT EXISTS docs (key TEXT PRIMARY KEY, data TEXT NOT NULL)');
  }
  get(key, fallback = null) {
    const r = this.db.prepare('SELECT data FROM docs WHERE key = ?').get(key);
    return r ? JSON.parse(r.data) : fallback;
  }
  set(key, value) { this.db.prepare('INSERT OR REPLACE INTO docs (key, data) VALUES (?, ?)').run(key, JSON.stringify(value)); return value; }
}

export function tx(db, fn) {
  db.exec('BEGIN');
  try { const out = fn(); db.exec('COMMIT'); return out; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** Builds every repository the app uses. */
export function createStores(db) {
  const jfl = (name, cols, opts) => new Repo(db, `jfl_${name}`, cols, opts);
  const efc = (name, cols, opts) => new Repo(db, `efc_${name}`, cols, opts);
  return {
    db,
    docs: new Docs(db),
    users: new Repo(db, 'users', ['email', 'role']),
    league: {
      seasons: jfl('seasons', ['status']),
      divisions: jfl('divisions', ['seasonId', 'status']),
      clubs: jfl('clubs'),
      teams: jfl('teams', ['clubId', 'divisionId', 'seasonId', 'regStatus']),
      players: jfl('players'),
      registrations: jfl('registrations', ['playerId', 'teamId', 'seasonId', 'status']),
      staff: jfl('staff', ['teamId']),
      officials: jfl('officials', ['status']),
      venues: jfl('venues'),
      fixtures: jfl('fixtures', ['seasonId', 'divisionId', 'status', 'date', 'homeId', 'awayId', 'venueId'], { orderBy: 'date' }),
      discipline: jfl('discipline', ['matchId', 'teamId', 'playerId', 'status']),
      applications: jfl('applications', ['divisionId', 'status']),
      transfers: jfl('transfers', ['status']),
      news: jfl('news', ['status'], { orderBy: 'id' }),
      announcements: jfl('announcements', ['status']),
      documents: jfl('documents', ['status', 'visibility']),
      sponsors: jfl('sponsors', ['status']),
      awards: jfl('awards', ['seasonId']),
      audit: jfl('audit', ['at', 'entity', 'entityId'], { orderBy: 'at' }),
      drafts: jfl('drafts'),
      enquiries: jfl('enquiries', ['kind'])
    },
    club: {
      matches: efc('matches', ['kind', 'date'], { orderBy: 'date' }),
      squads: efc('squads'),
      players: efc('players', ['squad', 'pos']),
      former: efc('former', ['squad']),
      people: efc('people', ['dept']),
      news: efc('news', ['cat', 'status', 'date'], { orderBy: 'date' }),
      gallery: efc('gallery'),
      enquiries: efc('enquiries', ['type'])
    }
  };
}
