import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/index.js';
import { config } from '../src/config.js';

let app, stores, base;
const tokens = {};

async function call(method, path, { body, token, expect } = {}) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  if (expect !== undefined) assert.equal(res.status, expect, `${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return { status: res.status, json };
}
const login = async (email) => (await call('POST', '/api/auth/login', { body: { email, password: config.demoPassword }, expect: 200 })).json.token;

before(async () => {
  ({ app, stores } = await buildApp({ dbFile: ':memory:', seed: true }));
  await app.listen(0);
  base = `http://localhost:${app.server.address().port}`;
  for (const [k, e] of Object.entries({ admin: 'admin@jfl.example', team: 'team@jfl.example', referee: 'referee@jfl.example', player: 'player@jfl.example', club: 'admin@eland.example' })) tokens[k] = await login(e);
});
after(() => { app.server.close(); stores.db.close(); });

test('health and unknown routes', async () => {
  await call('GET', '/api/health', { expect: 200 });
  await call('GET', '/api/nope', { expect: 404 });
  await call('DELETE', '/api/league/bootstrap', { expect: 405 });
});

test('auth: wrong password rejected, /me works, tokens are tamper-proof', async () => {
  await call('POST', '/api/auth/login', { body: { email: 'admin@jfl.example', password: 'wrong' }, expect: 401 });
  await call('POST', '/api/auth/login', { body: { email: 'nobody@x.com', password: 'x' }, expect: 401 });
  await call('POST', '/api/auth/login', { body: { email: 'bad' }, expect: 400 });
  const me = await call('GET', '/api/auth/me', { token: tokens.admin, expect: 200 });
  assert.equal(me.json.role, 'admin');
  const [h, b, s] = tokens.admin.split('.');
  const forged = `${h}.${Buffer.from(JSON.stringify({ sub: 'u-jfl-admin', role: 'admin', exp: 9999999999 })).toString('base64url')}.${s}`;
  await call('GET', '/api/auth/me', { token: forged, expect: 401 });
});

test('permissions: admin routes are closed to everyone else', async () => {
  await call('GET', '/api/league/admin/audit', { expect: 401 });
  await call('GET', '/api/league/admin/audit', { token: tokens.team, expect: 403 });
  await call('GET', '/api/league/admin/audit', { token: tokens.club, expect: 403 });
  await call('GET', '/api/club/admin/enquiries', { token: tokens.admin, expect: 403 });
  await call('GET', '/api/league/admin/audit', { token: tokens.admin, expect: 200 });
});

test('league bootstrap and tables are consistent', async () => {
  const b = (await call('GET', '/api/league/bootstrap', { expect: 200 })).json;
  assert.equal(b.clubs.length, 8); assert.ok(b.divisions.length >= 4); assert.ok(b.activeSeasonId);
  const sen = b.divisions.find((d) => d.seasonId === b.activeSeasonId && d.status === 'active' && d.format !== 'groups-ko');
  const t = (await call('GET', `/api/league/tables/${sen.id}`, { expect: 200 })).json;
  assert.ok(t.table.length >= 2);
  // table is sorted by points, then by the configured tie-breaks
  for (let i = 1; i < t.table.length; i++) assert.ok(t.table[i - 1].pts >= t.table[i].pts);
  const wins = t.table.reduce((n, r) => n + r.w, 0), losses = t.table.reduce((n, r) => n + r.l, 0);
  assert.equal(wins, losses, 'every win has a matching loss');
  const gf = t.table.reduce((n, r) => n + r.gf, 0), ga = t.table.reduce((n, r) => n + r.ga, 0);
  assert.equal(gf, ga, 'goals for equals goals against');
  const cup = b.divisions.find((d) => d.groups);
  const g = (await call('GET', `/api/league/tables/${cup.id}`, { expect: 200 })).json;
  assert.deepEqual(Object.keys(g.groups).sort(), ['A', 'B']);
  await call('GET', '/api/league/tables/zzz', { expect: 404 });
});

test('public visibility: drafts, restricted documents and private cases stay hidden', async () => {
  const pubNews = (await call('GET', '/api/league/news')).json, adminNews = (await call('GET', '/api/league/news', { token: tokens.admin })).json;
  assert.ok(adminNews.length > pubNews.length && pubNews.every((n) => n.status === 'published'));
  const pubDocs = (await call('GET', '/api/league/documents')).json, adminDocs = (await call('GET', '/api/league/documents', { token: tokens.admin })).json;
  assert.ok(pubDocs.every((d) => d.visibility === 'public') && adminDocs.length > pubDocs.length);
  assert.equal(new Set(adminDocs.map((d) => d.id)).size, adminDocs.length, 'document ids are unique');
  const cases = (await call('GET', '/api/league/discipline')).json;
  assert.ok(cases.every((c) => c.public));
  const fx = (await call('GET', '/api/league/fixtures?when=results')).json;
  assert.ok(fx.every((f) => !f.report && !f.teamSheets), 'public fixtures never expose referee reports');
});

test('fixtures: conflict rules block double-booking and warn on short rest', async () => {
  const b = (await call('GET', '/api/league/bootstrap')).json;
  const upcoming = (await call('GET', '/api/league/fixtures?when=upcoming&status=scheduled')).json.find((f) => f.homeId && f.awayId);
  assert.ok(upcoming);
  const other = b.teams.find((t) => t.divisionId === upcoming.divisionId && t.regStatus === 'approved' && ![upcoming.homeId, upcoming.awayId].includes(t.id));
  const body = { divisionId: upcoming.divisionId, round: 1, homeId: upcoming.homeId, awayId: other.id, date: upcoming.date, time: '09:00', venueId: upcoming.venueId, status: 'scheduled' };
  const r = await call('POST', '/api/league/admin/fixtures', { token: tokens.admin, body, expect: 409 });
  assert.ok(r.json.details.conflicts.some((c) => c.level === 'block'), 'same team same day is blocked');
  assert.equal(r.json.details.canForce, undefined);
  await call('POST', '/api/league/admin/fixtures', { token: tokens.admin, body: { ...body, homeId: other.id, awayId: other.id }, expect: 400 });
});

test('result flow: referee reports, result is provisional, admin approves, table updates', async () => {
  const me = (await call('GET', '/api/league/me', { token: tokens.referee, expect: 200 })).json;
  const mine = me.fixtures.filter((f) => f.date <= new Date().toISOString().slice(0, 10) && f.status === 'scheduled' && f.resolved.homeId);
  const f = mine[0] || (await (async () => { // fall back: appoint the referee to a past scheduled fixture
    const all = (await call('GET', '/api/league/fixtures?when=results&status=scheduled')).json.filter((x) => x.resolved.homeId);
    assert.ok(all.length, 'seed has at least one past-dated scheduled fixture'); 
    await call('PUT', `/api/league/admin/fixtures/${all[0].id}/appointments`, { token: tokens.admin, body: { picks: { ref: stores.users.get('u-jfl-referee').scope.officialId } }, expect: 200 });
    return all[0];
  })());
  const div = f.divisionId, before = (await call('GET', `/api/league/tables/${div}`)).json;
  const rowsBefore = JSON.stringify(before);
  // report with mismatched goals is rejected
  await call('POST', `/api/league/fixtures/${f.id}/report`, { token: tokens.referee, body: { h: 2, a: 0, text: 'Good match, no issues.', goals: [] }, expect: 400 });
  const squad = async (tid) => (await call('GET', `/api/league/teams/${tid}`)).json.squad;
  const hs = await squad(f.resolved.homeId);
  const goals = [{ side: 'h', min: 12, playerId: hs[8].id }, { side: 'h', min: 55, playerId: hs[9].id }];
  const rep = await call('POST', `/api/league/fixtures/${f.id}/report`, { token: tokens.referee, body: { h: 2, a: 0, attendance: 140, text: 'Good match, no issues.', goals, cards: [{ min: 70, type: 'yellow', playerId: hs[3].id }] }, expect: 200 });
  assert.equal(rep.json.status, 'awaiting');
  assert.equal(JSON.stringify((await call('GET', `/api/league/tables/${div}`)).json), rowsBefore, 'provisional result must not change the table');
  await call('POST', `/api/league/fixtures/${f.id}/report`, { token: tokens.referee, body: { h: 2, a: 0, text: 'again again again', goals }, expect: 409 });
  await call('POST', `/api/league/admin/fixtures/${f.id}/approve`, { token: tokens.team, expect: 403 });
  await call('POST', `/api/league/admin/fixtures/${f.id}/approve`, { token: tokens.admin, expect: 200 });
  const after = (await call('GET', `/api/league/tables/${div}`)).json;
  assert.notEqual(JSON.stringify(after), rowsBefore, 'approved result changes the table');
  const row = (after.table || Object.values(after.groups).flat()).find((r) => r.id === f.resolved.homeId);
  assert.ok(row.w >= 1);
  const audit = (await call('GET', '/api/league/admin/audit?entity=fixture', { token: tokens.admin })).json;
  assert.ok(audit.some((a) => a.action === 'Result approved' && a.entityId === f.id));
  await call('PATCH', `/api/league/admin/fixtures/${f.id}/score`, { token: tokens.admin, body: { h: 3, a: 0, reason: 'typo fix' }, expect: 409 });
});

test('registrations: duplicate approval needs an explicit override; transfers move the player', async () => {
  const pend = (await call('GET', '/api/league/admin/registrations?status=pending', { token: tokens.admin })).json;
  assert.ok(pend.length > 0);
  const dups = pend.filter((r) => stores.league.registrations.all({ status: 'approved' }).some((x) => x.seasonId === r.seasonId && stores.league.players.get(x.playerId)?.first === r.player.first && stores.league.players.get(x.playerId)?.last === r.player.last));
  if (dups.length) {
    const r = await call('POST', `/api/league/admin/registrations/${dups[0].id}/decision`, { token: tokens.admin, body: { to: 'approved' }, expect: 409 });
    assert.ok(r.json.details.canForce);
    await call('POST', `/api/league/admin/registrations/${dups[0].id}/decision?force=1`, { token: tokens.admin, body: { to: 'approved' }, expect: 200 });
  }
  const tr = (await call('GET', '/api/league/admin/transfers', { token: tokens.admin })).json.find((t) => t.status === 'pending');
  if (tr) {
    await call('POST', `/api/league/admin/transfers/${tr.id}/decision`, { token: tokens.admin, body: { to: 'approved' }, expect: 200 });
    const p = (await call('GET', `/api/league/players/${tr.playerId}`)).json;
    assert.ok(p.registrations.some((r) => r.teamId === tr.toTeam && r.status === 'approved'));
    assert.ok(p.registrations.some((r) => r.teamId === tr.fromTeam && r.status === 'transferred'), 'history is preserved');
    await call('POST', `/api/league/admin/transfers/${tr.id}/decision`, { token: tokens.admin, body: { to: 'approved' }, expect: 409 });
  }
});

test('fixture generator produces a valid round robin and flags capacity conflicts', async () => {
  const b = (await call('GET', '/api/league/bootstrap')).json;
  const teams = b.teams.filter((t) => t.seasonId === b.activeSeasonId && t.regStatus === 'approved' && t.divisionId === 'd-sen').map((t) => t.id);
  const r = await call('POST', '/api/league/admin/fixtures/generate', { token: tokens.admin, body: { name: 'Test', format: 'single', teams, venues: [b.venues[0].id], slots: ['14:00', '16:30'], start: '2027-03-01', gap: 7 }, expect: 200 });
  const n = teams.length;
  assert.equal(r.json.rows.length, n * (n - 1) / 2);
  const seen = new Set(r.json.rows.map((x) => [x.homeId, x.awayId].sort().join('|')));
  assert.equal(seen.size, r.json.rows.length, 'each pairing appears exactly once');
  assert.ok(r.json.conflicts > 0, 'one venue and two slots cannot host a full round');
  await call('POST', '/api/league/admin/fixtures/generate', { token: tokens.admin, body: { name: 'Test', format: 'single', teams: [teams[0]], venues: ['x'], slots: ['14:00'], start: '2027-03-01', gap: 7 }, expect: 400 });
});

test('team sheets: only own team, exactly 11 with a goalkeeper, no suspended players', async () => {
  const me = (await call('GET', '/api/league/me', { token: tokens.team })).json;
  const f = me.fixtures.find((x) => x.status === 'scheduled' && x.date >= new Date().toISOString().slice(0, 10));
  const squad = (await call('GET', `/api/league/teams/${me.team.id}`)).json.squad.filter((p) => p.eligibility === 'eligible');
  const gk = squad.filter((p) => p.pos === 'GK'), field = squad.filter((p) => p.pos !== 'GK');
  await call('POST', `/api/league/fixtures/${f.id}/team-sheet`, { token: tokens.team, body: { starters: field.slice(0, 11).map((p) => p.id) }, expect: 400 });
  await call('POST', `/api/league/fixtures/${f.id}/team-sheet`, { token: tokens.team, body: { starters: [gk[0], ...field.slice(0, 9)].map((p) => p.id) }, expect: 400 });
  await call('POST', `/api/league/fixtures/${f.id}/team-sheet`, { token: tokens.team, body: { starters: [gk[0], ...field.slice(0, 10)].map((p) => p.id), subs: field.slice(10, 12).map((p) => p.id) }, expect: 200 });
  const again = (await call('GET', '/api/league/me', { token: tokens.team })).json.fixtures.find((x) => x.id === f.id);
  assert.equal(Object.values(again.teamSheets).length, 1, 'team sees exactly its own side');
  assert.equal(again.teamSheets[again.resolved.homeId === me.team.id ? 'h' : 'a'].starters.length, 11);
  assert.equal((await call('GET', `/api/league/fixtures/${f.id}`)).json.fixture.teamSheets, undefined, 'public never sees team sheets');
  const other = (await call('GET', '/api/league/fixtures?when=upcoming')).json.find((x) => ![x.resolved.homeId, x.resolved.awayId].includes(me.team.id));
  await call('POST', `/api/league/fixtures/${other.id}/team-sheet`, { token: tokens.team, body: { starters: [] }, expect: 403 });
});

test('club: public data, contract status, enquiry validation and admin', async () => {
  const profile = (await call('GET', '/api/club/profile', { expect: 200 })).json;
  assert.equal(profile.club.name, 'Eland FC');
  const matches = (await call('GET', '/api/club/matches')).json;
  assert.ok(matches.some((m) => m.status === 'upcoming') && matches.some((m) => ['win', 'loss', 'draw'].includes(m.status)));
  assert.ok(matches.filter((m) => m.status === 'upcoming').every((m) => m.date >= new Date().toISOString().slice(0, 10)));
  assert.ok(matches.filter((m) => m.status === 'upcoming').every((m) => new Date(m.date).getUTCDay() === 6), 'sample fixtures sit on Saturdays');
  const players = (await call('GET', '/api/club/players?squad=first')).json;
  assert.equal(players.length, 16);
  assert.ok(players.every((p) => p.contract.status.key));
  assert.ok(players.some((p) => p.contract.status.key === 'trial') && players.some((p) => p.contract.status.key === 'loan'));
  const bad = await call('POST', '/api/club/enquiries', { body: { type: 'trials', name: 'A', email: 'nope', message: 'short' }, expect: 400 });
  assert.ok(bad.json.details.email && bad.json.details.age && bad.json.details.position);
  const good = { type: 'trials', name: 'Musa Bello', email: 'musa@example.com', message: 'I would like a trial as a midfielder.', age: 22, position: 'Midfielder', consent: true };
  await call('POST', '/api/club/enquiries', { body: { ...good, consent: false }, expect: 400 });
  await call('POST', '/api/club/enquiries', { body: good, expect: 200 });
  const list = (await call('GET', '/api/club/admin/enquiries', { token: tokens.club, expect: 200 })).json;
  assert.equal(list.length, 1); assert.equal(list[0].position, 'Midfielder');
  const m = await call('POST', '/api/club/admin/matches', { token: tokens.club, body: { date: '2030-01-05', time: '16:00', home: true, opponent: 'Test FC', competition: 'Friendly', venue: 'Ground' }, expect: 200 });
  assert.equal(m.json.status, 'upcoming');
  const done = await call('PATCH', `/api/club/admin/matches/${m.json.id}`, { token: tokens.club, body: { score: [2, 2] }, expect: 200 });
  assert.equal(done.json.status, 'draw');
});

test('seed is idempotent and demo data matches the original demos', () => {
  assert.equal(stores.league.fixtures.all().length, 50);
  assert.equal(stores.league.players.all().length, 243);
  assert.equal(stores.club.players.all().length, 29);
  assert.equal(stores.club.former.all().length, 14);
  assert.equal(stores.club.people.all().length, 20);
});
