import fs from 'node:fs';
import { buildSeed, isoDate, addDays, today0 } from './jflGenerator.js';
import { tx } from '../db.js';
import { hashPassword } from '../auth.js';
import { config } from '../config.js';

const clubData = JSON.parse(fs.readFileSync(new URL('./club-data.json', import.meta.url), 'utf8'));

/* The club demo expresses dates as day / month offsets from "today" so the sample season always looks live.
   A real database stores absolute dates, so we convert once at seed time. */
const atMidnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dayOffset = (n) => { const d = atMidnight(); d.setDate(d.getDate() + n); return d; };
const saturdayFromOffset = (offset) => {
  const d = dayOffset(offset);
  d.setDate(d.getDate() + (offset >= 0 ? (6 - d.getDay() + 7) % 7 : -((d.getDay() + 1) % 7)));
  return d;
};
const monthStart = (m) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + m); return isoDate(d); };

export function hasData(stores) {
  return stores.league.seasons.all().length > 0 || stores.club.matches.all().length > 0;
}

export async function seedAll(stores, { force = false } = {}) {
  if (hasData(stores) && !force) return { skipped: true };
  const league = buildSeed();
  const users = await demoUsers(league);

  tx(stores.db, () => {
    for (const repo of [...Object.values(stores.league), ...Object.values(stores.club), stores.users]) repo.clear();
    stores.db.exec('DELETE FROM docs');
    seedLeague(stores, league);
    seedClub(stores);
    users.forEach((u) => stores.users.insert(u));
  });
  return { skipped: false, users: users.map(({ email, role }) => ({ email, role })) };
}

function seedLeague(stores, S) {
  const L = stores.league;
  // The demo's document helper derives ids from S.documents.length before the array exists, so every
  // document came out as "doc01". Give each one a unique, stable id.
  S.documents.forEach((d, i) => { d.id = `doc${String(i + 1).padStart(2, '0')}`; });
  stores.docs.set('jfl.config', S.config);
  const plain = ['seasons', 'divisions', 'clubs', 'teams', 'players', 'registrations', 'staff', 'officials', 'venues', 'fixtures', 'discipline', 'applications', 'transfers', 'news', 'announcements', 'documents', 'sponsors', 'awards', 'audit'];
  plain.forEach((k) => S[k].forEach((row) => L[k].insert(row)));
  stores.docs.set('jfl.meta', { seededAt: S.seededAt, dataVersion: S.version, ui: S.ui });
}

function seedClub(stores) {
  const C = stores.club, d = clubData;
  stores.docs.set('efc.profile', {
    club: d.CLUB, season: d.SEASON, photos: d.PHOTOS, positions: d.POSITIONS, contractTypes: d.CONTRACT_TYPES, availability: d.AVAILABILITY,
    sampleLineup: d.SAMPLE_LINEUP, departments: d.DEPARTMENTS, org: d.ORG, governance: d.GOVERNANCE, records: d.CLUB_RECORDS,
    league: d.LEAGUE, partnerTiers: d.PARTNER_TIERS, newsCategories: d.NEWS_CATS, opportunities: d.OPPORTUNITIES, roadmap: d.ROADMAP
  });
  d.SQUADS.forEach((s) => C.squads.insert(s));
  d.MATCHES.forEach((m) => {
    const { offset, ...rest } = m;
    const date = saturdayFromOffset(offset);
    const status = m.postponed ? 'postponed' : m.score ? (m.score[0] > m.score[1] ? 'win' : m.score[0] < m.score[1] ? 'loss' : 'draw') : 'upcoming';
    C.matches.insert({ ...rest, date: isoDate(date), status, kind: status === 'upcoming' ? 'fixture' : 'result' });
  });
  d.PLAYERS.forEach((p) => {
    const { contract, ...rest } = p;
    C.players.insert({ ...rest, contract: { type: contract.type, startDate: monthStart(contract.start), endDate: monthStart(contract.end), registered: contract.registered } });
  });
  d.FORMER.forEach((f) => C.former.insert({ id: f.reg, ...f }));
  d.PEOPLE.forEach((p, i) => C.people.insert({ ...p, sort: i }));
  d.NEWS.forEach((n) => { const { offset, ...rest } = n; C.news.insert({ ...rest, date: isoDate(dayOffset(offset)), status: 'published' }); });
  d.GALLERY.forEach((g, i) => C.gallery.insert({ id: `g${i + 1}`, sort: i, ...g }));
}

async function demoUsers(league) {
  const pw = await hashPassword(config.demoPassword);
  const ui = league.ui;
  const mk = (id, email, name, role, scope = {}) => ({ id, email, name, role, scope, passwordHash: pw });
  return [
    mk('u-efc-admin', 'admin@eland.example', 'Eland FC administrator', 'club_admin'),
    mk('u-jfl-admin', 'admin@jfl.example', 'Competition secretary', 'admin'),
    mk('u-jfl-team', 'team@jfl.example', 'Team representative', 'team', { teamId: ui.roleTeam }),
    mk('u-jfl-coach', 'coach@jfl.example', 'Team coach', 'coach', { teamId: ui.roleTeam }),
    mk('u-jfl-player', 'player@jfl.example', 'Registered player', 'player', { playerId: ui.rolePlayer }),
    mk('u-jfl-referee', 'referee@jfl.example', 'Match official', 'referee', { officialId: ui.roleOfficial }),
    mk('u-jfl-media', 'media@jfl.example', 'Media representative', 'media'),
    mk('u-jfl-sponsor', 'sponsor@jfl.example', 'Partner representative', 'sponsor')
  ];
}
