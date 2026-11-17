import crypto from 'node:crypto';
import { requireRole, requireUser, rateLimit } from '../auth.js';
import { badRequest, conflict, forbidden, notFound, validate, HttpError } from '../http.js';
import { tx } from '../db.js';
import * as C from '../domain/competition.js';

const uid = (p) => `${p}-${crypto.randomBytes(5).toString('hex')}`;
const today = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();
const ROLE_KEYS = { ref: 'Referee', ar1: 'Assistant referee 1', ar2: 'Assistant referee 2', comm: 'Match commissioner' };
const OPEN_CASE = ['submitted', 'under-review', 'awaiting-response'];
const CASE_STATUSES = ['submitted', 'under-review', 'awaiting-response', 'upheld', 'rejected', 'resolved', 'closed'];
const PRIVILEGED = ['admin'];

export function mountLeague(app, stores) {
  const L = stores.league;
  const cfg = () => stores.docs.get('jfl.config');

  const snap = () => C.snapshotIndex({
    config: cfg(), seasons: L.seasons.all(), divisions: L.divisions.all(), teams: L.teams.all(), fixtures: L.fixtures.all(),
    registrations: L.registrations.all(), discipline: L.discipline.all(), players: L.players.all(), venues: L.venues.all(), officials: L.officials.all()
  });
  const activeSeason = (s) => s.seasons.find((x) => x.status === 'active') || s.seasons[0];
  const isAdmin = (u) => !!u && PRIVILEGED.includes(u.role);

  function audit(user, action, entity, entityId, before = '', after = '', approved = null) {
    L.audit.insert({ id: uid('au'), at: nowISO(), actor: user ? `${user.name} (${user.role})` : 'System', actorId: user?.id || null, action, entity, entityId, before: String(before ?? ''), after: String(after ?? ''), approved });
  }

  /* A fixture as the outside world may see it. Teams for knockout slots are resolved from approved results. */
  function project(s, f, user) {
    const ids = C.resolveTeams(s, f);
    const out = { ...f, resolved: ids };
    const showDetail = C.isOfficial(f) || f.status === 'awaiting' || f.status === 'abandoned' || isAdmin(user);
    if (!showDetail) { out.events = []; out.lineups = undefined; }
    if (!isAdmin(user) && user?.role !== 'referee') {
      delete out.report;
      // A team manager or coach may see their own side's submitted sheet, never the opponent's.
      const tid = ['team', 'coach'].includes(user?.role) ? user.scope?.teamId : null;
      const side = tid && (ids.homeId === tid ? 'h' : ids.awayId === tid ? 'a' : null);
      if (side && f.teamSheets?.[side]) out.teamSheets = { [side]: f.teamSheets[side] }; else delete out.teamSheets;
    }
    return out;
  }

  /* ------------------------------------------------------------------ public reads */
  app.get('/api/league/bootstrap', (ctx) => {
    const s = snap();
    const sponsors = L.sponsors.all(isAdmin(ctx.user) ? {} : { status: 'active' });
    return {
      config: s.config, seasons: s.seasons, activeSeasonId: activeSeason(s).id, divisions: s.divisions, clubs: L.clubs.all(),
      teams: s.teams, venues: s.venues, sponsors, awards: L.awards.all(), fixtureStatus: C.FIXTURE_STATUS, serverDate: today()
    };
  });

  app.get('/api/league/fixtures', (ctx) => {
    const s = snap(), q = ctx.query;
    let list = s.fixtures.filter((f) =>
      (!q.seasonId || f.seasonId === q.seasonId) && (!q.divisionId || f.divisionId === q.divisionId) && (!q.status || f.status === q.status) &&
      (!q.venueId || f.venueId === q.venueId) && (!q.from || f.date >= q.from) && (!q.to || f.date <= q.to));
    if (q.teamId) list = list.filter((f) => { const i = C.resolveTeams(s, f); return [i.homeId, i.awayId].includes(q.teamId); });
    if (q.when === 'upcoming') list = list.filter((f) => f.date >= today() && ['scheduled', 'postponed'].includes(f.status));
    if (q.when === 'results') list = list.filter((f) => f.date <= today() || C.isOfficial(f));
    list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (q.order === 'desc') list.reverse();
    return list.map((f) => project(s, f, ctx.user));
  });

  app.get('/api/league/fixtures/:id', (ctx) => {
    const s = snap(), f = s.fixById.get(ctx.params.id);
    if (!f) throw notFound('Match not found');
    const user = ctx.user;
    const cases = L.discipline.all({ matchId: f.id }).filter((d) => d.public || isAdmin(user));
    return { fixture: project(s, f, user), cases: cases.map((d) => caseView(d, user)), conflicts: isAdmin(user) ? C.fixtureConflicts(s, f) : undefined };
  });

  app.get('/api/league/tables/:divisionId', (ctx) => {
    const s = snap(), t = C.divisionTables(s, ctx.params.divisionId);
    if (!t) throw notFound('Division not found');
    return t;
  });

  app.get('/api/league/stats/players', (ctx) => {
    const s = snap();
    const rows = C.playerStats(s, { seasonId: ctx.query.seasonId || activeSeason(s).id, divisionId: ctx.query.divisionId || null, teamId: ctx.query.teamId || null });
    return rows.map((r) => { const p = s.playerById.get(r.playerId); return { ...r, name: p ? `${p.first} ${p.last}` : r.playerId, pos: p?.pos }; });
  });
  app.get('/api/league/stats/teams', (ctx) => {
    const s = snap(), divisionId = ctx.query.divisionId;
    if (!divisionId) throw badRequest('divisionId is required');
    return C.teamStats(s, s.fixtures.filter((f) => f.divisionId === divisionId), C.divisionTeamIds(s, divisionId));
  });

  app.get('/api/league/teams/:id', (ctx) => {
    const s = snap(), t = s.teamById.get(ctx.params.id);
    if (!t) throw notFound('Team not found');
    const squad = L.registrations.all({ teamId: t.id, status: 'approved' }).map((reg) => ({ reg, player: s.playerById.get(reg.playerId) }))
      .filter((x) => x.player).sort((a, b) => a.reg.number - b.reg.number)
      .map(({ reg, player }) => ({ ...player, number: reg.number, registrationId: reg.id, eligibility: C.eligibility(s, player.id) }));
    const fixtures = s.fixtures.filter((f) => { const i = C.resolveTeams(s, f); return [i.homeId, i.awayId].includes(t.id); }).sort((a, b) => a.date.localeCompare(b.date)).map((f) => project(s, f, ctx.user));
    return { team: t, club: L.clubs.get(t.clubId), squad, staff: L.staff.all({ teamId: t.id }), fixtures };
  });

  app.get('/api/league/players', (ctx) => {
    const s = snap(), q = ctx.query;
    const sid = q.seasonId || activeSeason(s).id;
    const regs = L.registrations.all({ seasonId: sid, status: 'approved' });
    let rows = regs.map((reg) => { const p = s.playerById.get(reg.playerId); return p && { ...p, number: reg.number, teamId: reg.teamId, registrationId: reg.id, eligibility: C.eligibility(s, p.id) }; }).filter(Boolean);
    if (q.teamId) rows = rows.filter((r) => r.teamId === q.teamId);
    if (q.pos) rows = rows.filter((r) => r.pos === q.pos);
    if (q.q) rows = rows.filter((r) => `${r.first} ${r.last}`.toLowerCase().includes(q.q.toLowerCase()));
    const total = rows.length;
    rows.sort((a, b) => a.last.localeCompare(b.last) || a.first.localeCompare(b.first));
    const limit = Math.min(Number(q.limit) || 48, 200), offset = Number(q.offset) || 0;
    return { total, rows: rows.slice(offset, offset + limit) };
  });
  app.get('/api/league/players/:id', (ctx) => {
    const s = snap(), p = s.playerById.get(ctx.params.id);
    if (!p) throw notFound('Player not found');
    const regs = L.registrations.all({ playerId: p.id }).filter((r) => isAdmin(ctx.user) || r.status === 'approved' || r.status === 'transferred')
      .sort((a, b) => (s.seasons.find((x) => x.id === b.seasonId)?.start || '').localeCompare(s.seasons.find((x) => x.id === a.seasonId)?.start || ''));
    const stats = C.playerStats(s, { seasonId: null }).find((r) => r.playerId === p.id) || null;
    return { player: p, registrations: regs, eligibility: C.eligibility(s, p.id), stats };
  });

  app.get('/api/league/officials', (ctx) => L.officials.all(isAdmin(ctx.user) ? {} : { status: 'approved' }));
  app.get('/api/league/officials/:id', (ctx) => {
    const o = L.officials.get(ctx.params.id);
    if (!o || (o.status !== 'approved' && !isAdmin(ctx.user))) throw notFound('Official not found');
    const s = snap();
    const fixtures = s.fixtures.filter((f) => Object.values(f.officials || {}).some((a) => a?.id === o.id)).sort((a, b) => b.date.localeCompare(a.date)).map((f) => project(s, f, ctx.user));
    return { official: o, fixtures };
  });

  const published = (ctx, repo) => repo.all(isAdmin(ctx.user) ? {} : { status: 'published' });
  app.get('/api/league/news', (ctx) => published(ctx, L.news).sort((a, b) => b.date.localeCompare(a.date)));
  app.get('/api/league/news/:id', (ctx) => {
    const n = L.news.get(ctx.params.id);
    if (!n || (n.status !== 'published' && !isAdmin(ctx.user))) throw notFound('Story not found');
    return n;
  });
  app.get('/api/league/announcements', (ctx) => published(ctx, L.announcements).sort((a, b) => b.date.localeCompare(a.date)));
  app.get('/api/league/documents', (ctx) => L.documents.all(isAdmin(ctx.user) ? {} : { visibility: 'public' }).filter((d) => isAdmin(ctx.user) || d.status !== 'draft'));
  app.get('/api/league/documents/:id', (ctx) => {
    const d = L.documents.get(ctx.params.id);
    if (!d || (d.visibility !== 'public' && !isAdmin(ctx.user))) throw notFound('Document not found');
    return d;
  });

  /* Disciplinary cases: the public sees only those marked public, and never the internal notes. */
  function caseView(d, user) {
    if (isAdmin(user)) return d;
    const own = ['team', 'coach'].includes(user?.role) && d.teamId === user.scope?.teamId;
    const { history, ...rest } = d;
    return own ? d : { ...rest, history: history.filter((h) => !h.internal).map(({ at, status }) => ({ at, status })) };
  }
  app.get('/api/league/discipline', (ctx) => {
    const u = ctx.user;
    return L.discipline.all().filter((d) => isAdmin(u) || d.public || (['team', 'coach'].includes(u?.role) && d.teamId === u.scope?.teamId)).map((d) => caseView(d, u));
  });

  app.post('/api/league/enquiries', (ctx) => {
    if (!rateLimit(`jfl-enq:${ctx.req.socket.remoteAddress}`, 8, 60 * 60 * 1000)) throw new HttpError(429, 'Too many messages. Please try again later.');
    const d = validate(ctx.body, { kind: ['contact', 'team', 'official', 'media', 'sponsor'], name: { type: 'string', minLen: 2, maxLen: 120 }, email: 'email', message: { type: 'string', minLen: 10, maxLen: 4000 }, org: { type: 'string', optional: true, maxLen: 160 } });
    const rec = { id: uid('enq'), ...d, at: nowISO(), status: 'new' };
    L.enquiries.insert(rec);
    return { ok: true, id: rec.id };
  });

  /* ------------------------------------------------------------------ portals (signed-in) */
  const referee = (ctx) => { const o = L.officials.get(ctx.user.scope?.officialId); if (!o) throw forbidden('No official profile is linked to this account.'); return o; };
  const myTeamId = (ctx) => ctx.user.scope?.teamId;

  app.get('/api/league/me', requireUser, (ctx) => {
    const s = snap(), u = ctx.user, sc = u.scope || {};
    const out = { user: u };
    if (sc.teamId) {
      const t = s.teamById.get(sc.teamId);
      out.team = t;
      out.fixtures = s.fixtures.filter((f) => { const i = C.resolveTeams(s, f); return [i.homeId, i.awayId].includes(sc.teamId); }).map((f) => project(s, f, u));
      out.cases = L.discipline.all({ teamId: sc.teamId }).map((d) => caseView(d, u));
    }
    if (sc.playerId) out.player = { player: s.playerById.get(sc.playerId), eligibility: C.eligibility(s, sc.playerId), registrations: L.registrations.all({ playerId: sc.playerId }) };
    if (sc.officialId) {
      out.official = L.officials.get(sc.officialId);
      out.fixtures = s.fixtures.filter((f) => Object.values(f.officials || {}).some((a) => a?.id === sc.officialId)).map((f) => project(s, f, u));
    }
    return out;
  });

  app.post('/api/league/fixtures/:id/team-sheet', requireRole('team', 'coach'), (ctx) => {
    const s = snap(), f = s.fixById.get(ctx.params.id);
    if (!f) throw notFound('Match not found');
    const tid = myTeamId(ctx), ids = C.resolveTeams(s, f);
    if (![ids.homeId, ids.awayId].includes(tid)) throw forbidden('This is not your team\'s match.');
    const side = ids.homeId === tid ? 'h' : 'a';
    const d = validate(ctx.body, { starters: 'any', subs: { type: 'any', optional: true } });
    const starters = [...new Set(d.starters || [])], subs = [...new Set(d.subs || [])];
    const squad = new Set(L.registrations.all({ teamId: tid, status: 'approved' }).map((r) => r.playerId));
    if (![...starters, ...subs].every((id) => squad.has(id))) throw badRequest('Only registered players from your squad can be selected.');
    if (starters.some((id) => subs.includes(id))) throw badRequest('A player cannot be both a starter and a substitute.');
    if (starters.some((id) => C.isSuspended(s, id)) || subs.some((id) => C.isSuspended(s, id))) throw badRequest('A suspended player cannot be selected.');
    if (starters.length !== 11) throw badRequest(`Select exactly 11 starters (currently ${starters.length}).`);
    if (!starters.some((id) => s.playerById.get(id)?.pos === 'GK')) throw badRequest('Your starting XI must include a goalkeeper.');
    if (subs.length > 7) throw badRequest('Select no more than 7 substitutes.');
    const teamSheets = { ...(f.teamSheets || {}), [side]: { starters, subs, at: nowISO(), by: ctx.user.name } };
    L.fixtures.update(f.id, { teamSheets });
    audit(ctx.user, 'Team sheet submitted', 'fixture', f.id, '', `${C.teamName(s, tid)}: ${starters.length} + ${subs.length}`);
    return { ok: true };
  });

  app.post('/api/league/fixtures/:id/appointments/:slot/respond', requireRole('referee'), (ctx) => {
    const o = referee(ctx), f = L.fixtures.get(ctx.params.id), slot = ctx.params.slot;
    if (!f) throw notFound('Match not found');
    const a = f.officials?.[slot];
    if (!ROLE_KEYS[slot] || !a || a.id !== o.id) throw forbidden('That appointment is not yours.');
    const { to } = validate(ctx.body, { to: ['confirmed', 'declined'] });
    const before = a.status;
    L.fixtures.update(f.id, { officials: { ...f.officials, [slot]: { ...a, status: to } } });
    audit(ctx.user, `Appointment ${to}`, 'fixture', f.id, `${ROLE_KEYS[slot]}: ${before}`, `${ROLE_KEYS[slot]}: ${to}`);
    return { ok: true };
  });

  app.post('/api/league/fixtures/:id/report', requireRole('referee'), (ctx) => {
    const o = referee(ctx), s = snap(), f = s.fixById.get(ctx.params.id);
    if (!f) throw notFound('Match not found');
    if (!Object.values(f.officials || {}).some((a) => a?.id === o.id)) throw forbidden('You are not appointed to this match.');
    if (f.date > today()) throw badRequest('A report can only be submitted on or after the match date.');
    if (['awaiting', 'completed'].includes(f.status) && f.approval !== 'disputed') throw conflict('A result has already been submitted for this match.');
    const d = validate(ctx.body, { h: { type: 'number', min: 0, max: 30 }, a: { type: 'number', min: 0, max: 30 }, attendance: { type: 'number', optional: true, min: 0 }, text: { type: 'string', minLen: 10, maxLen: 4000 }, goals: { type: 'any', optional: true }, cards: { type: 'any', optional: true } });
    const ids = C.resolveTeams(s, f);
    if (!ids.homeId || !ids.awayId) throw badRequest('Both teams must be known before a result is recorded.');
    const teamOf = (pid) => L.registrations.all({ playerId: pid, status: 'approved' }).find((r) => [ids.homeId, ids.awayId].includes(r.teamId))?.teamId;
    const goals = d.goals || [], cards = d.cards || [];
    const events = [];
    for (const [side, tid, n] of [['h', ids.homeId, d.h], ['a', ids.awayId, d.a]]) {
      const mine = goals.filter((g) => g.side === side);
      if (mine.length !== n) throw badRequest(`Record a scorer and minute for each of the ${n} ${side === 'h' ? 'home' : 'away'} goals.`);
      mine.forEach((g) => events.push({ min: Number(g.min), type: 'goal', teamId: tid, playerId: g.playerId }));
    }
    cards.forEach((c) => { if (!['yellow', 'red'].includes(c.type)) throw badRequest('Card type must be yellow or red.'); events.push({ min: Number(c.min), type: c.type, teamId: teamOf(c.playerId), playerId: c.playerId }); });
    if (events.some((e) => !Number.isFinite(e.min) || e.min < 0 || e.min > 130 || !e.playerId || !e.teamId)) throw badRequest('Every event needs a valid minute and a player from one of the two squads.');
    events.sort((x, y) => x.min - y.min);
    const sheetOr = (side, tid) => f.teamSheets?.[side]?.starters || L.registrations.all({ teamId: tid, status: 'approved' }).sort((x, y) => x.number - y.number).slice(0, 11).map((r) => r.playerId);
    const lineups = { h: sheetOr('h', ids.homeId), a: sheetOr('a', ids.awayId) };
    events.forEach((e) => { const side = e.teamId === ids.homeId ? 'h' : 'a'; if (!lineups[side].includes(e.playerId)) lineups[side] = [...lineups[side].slice(0, 10), e.playerId]; });
    L.fixtures.update(f.id, { events, lineups, result: { h: d.h, a: d.a }, attendance: d.attendance ?? null, report: { by: o.id, at: today(), text: d.text }, status: 'awaiting', approval: 'submitted' });
    audit(ctx.user, 'Match report submitted', 'fixture', f.id, 'No result', `Submitted ${d.h}–${d.a}`);
    return { ok: true, status: 'awaiting' };
  });

  app.post('/api/league/incidents', requireRole('referee'), (ctx) => {
    const o = referee(ctx), s = snap();
    const d = validate(ctx.body, { matchId: 'string', category: ['Player misconduct', 'Technical area conduct', 'Spectator behaviour', 'Facilities / safety', 'Other'], note: { type: 'string', minLen: 20, maxLen: 4000 } });
    const f = s.fixById.get(d.matchId);
    if (!f || !Object.values(f.officials || {}).some((a) => a?.id === o.id)) throw forbidden('You can only report on matches you were appointed to.');
    const c = { id: uid('dc'), type: 'Match incident', category: d.category, date: today(), matchId: f.id, teamId: null, playerId: null, status: 'submitted', decision: '', public: false, history: [{ at: today(), by: `${o.first} ${o.last} (official)`, status: 'submitted', note: d.note, internal: true }] };
    L.discipline.insert(c);
    audit(ctx.user, 'Incident reported', 'discipline', c.id, '', d.category);
    return c;
  });

  app.post('/api/league/discipline/:id/response', requireRole('team', 'coach'), (ctx) => {
    const c = L.discipline.get(ctx.params.id);
    if (!c || c.teamId !== myTeamId(ctx)) throw notFound('Case not found');
    const { note } = validate(ctx.body, { note: { type: 'string', minLen: 10, maxLen: 4000 } });
    const history = [...c.history, { at: today(), by: ctx.user.name, status: c.status, note, internal: false }];
    L.discipline.update(c.id, { history });
    audit(ctx.user, 'Club response recorded', 'discipline', c.id, '', c.status);
    return { ok: true };
  });

  /* ------------------------------------------------------------------ admin */
  const admin = requireRole('admin');

  app.get('/api/league/admin/dashboard', admin, () => {
    const s = snap(), sid = activeSeason(s).id;
    const upcoming = s.fixtures.filter((f) => f.seasonId === sid && f.date >= today());
    return {
      pendingApplications: L.applications.all().filter((a) => ['submitted', 'under-review', 'corrections'].includes(a.status)).length,
      pendingPlayers: L.registrations.all({ status: 'pending' }).length,
      pendingTransfers: L.transfers.all({ status: 'pending' }).length,
      pendingOfficials: L.officials.all({ status: 'pending' }).length,
      resultsToReview: s.fixtures.filter((f) => ['awaiting', 'review'].includes(f.status)).length,
      openCases: L.discipline.all().filter((c) => OPEN_CASE.includes(c.status)).length,
      conflicts: upcoming.flatMap((f) => C.fixtureConflicts(s, f)).length,
      missingReferee: upcoming.filter((f) => f.status === 'scheduled' && f.homeId && !f.officials?.ref).length,
      newEnquiries: L.enquiries.all({}).filter((e) => e.status === 'new').length,
      recentAudit: L.audit.all({}, { desc: true, limit: 8 })
    };
  });
  app.get('/api/league/admin/audit', admin, (ctx) => L.audit.all(ctx.query.entity ? { entity: ctx.query.entity } : {}, { desc: true, limit: Math.min(Number(ctx.query.limit) || 100, 500) }));
  app.get('/api/league/admin/applications', admin, () => L.applications.all());
  app.get('/api/league/admin/registrations', admin, (ctx) => L.registrations.all(ctx.query.status ? { status: ctx.query.status } : {}).map((r) => ({ ...r, player: L.players.get(r.playerId) })));
  app.get('/api/league/admin/transfers', admin, () => L.transfers.all());
  app.get('/api/league/admin/drafts', admin, () => L.drafts.all());
  app.get('/api/league/admin/enquiries', admin, () => L.enquiries.all({}, { orderBy: 'id' }));

  app.put('/api/league/admin/config', admin, (ctx) => {
    const d = validate(ctx.body, {
      compName: { type: 'string', minLen: 3 }, shortName: { type: 'string', minLen: 2, maxLen: 8 }, status: 'string', eligibility: { type: 'string', optional: true },
      regOpen: { type: 'string', optional: true }, regClose: { type: 'string', optional: true }, squadMin: { type: 'any', optional: true }, squadMax: { type: 'any', optional: true },
      minRestDays: { type: 'number', min: 0, max: 30 }, w: { type: 'number', min: 0, max: 10 }, d: { type: 'number', min: 0, max: 10 }, l: { type: 'number', min: 0, max: 10 }, tiebreak: 'any'
    });
    const c = cfg();
    const before = `W${c.points.w}/D${c.points.d}/L${c.points.l} · ${c.tiebreak.join('>')} · ${c.compName}`;
    const tb = [].concat(d.tiebreak).filter((v, i, a) => ['gd', 'gf', 'wins', 'h2h'].includes(v) && a.indexOf(v) === i);
    if (!tb.length) throw badRequest('Choose at least one tie-break rule.', { tiebreak: 'Choose at least one.' });
    const next = { ...c, compName: d.compName, shortName: d.shortName, status: d.status, eligibility: d.eligibility ?? c.eligibility, regOpen: d.regOpen ?? c.regOpen, regClose: d.regClose ?? c.regClose, squadMin: d.squadMin ?? c.squadMin, squadMax: d.squadMax ?? c.squadMax, minRestDays: d.minRestDays, points: { w: d.w, d: d.d, l: d.l }, tiebreak: tb };
    stores.docs.set('jfl.config', next);
    audit(ctx.user, 'Competition settings changed', 'config', 'config', before, `W${d.w}/D${d.d}/L${d.l} · ${tb.join('>')} · ${d.compName}`, true);
    return next;
  });

  app.post('/api/league/admin/seasons', admin, (ctx) => {
    const d = validate(ctx.body, { name: { type: 'string', minLen: 3, maxLen: 80 }, copy: { type: 'boolean', optional: true } });
    const s = snap(), sid = activeSeason(s).id;
    const start = new Date(Date.now() + 300 * 864e5).toISOString().slice(0, 10), end = new Date(Date.now() + 420 * 864e5).toISOString().slice(0, 10);
    const season = { id: uid('s'), name: d.name, label: 'Draft season', status: 'draft', start, end };
    tx(stores.db, () => {
      L.seasons.insert(season);
      if (d.copy) s.divisions.filter((x) => x.seasonId === sid).forEach((x) => L.divisions.insert({ ...x, id: uid('d'), seasonId: season.id, status: 'draft', groups: x.groups ? { A: [], B: [] } : undefined }));
      audit(ctx.user, 'Draft season created', 'season', season.id, '', d.name);
    });
    return season;
  });
  app.delete('/api/league/admin/seasons/:id', admin, (ctx) => {
    const se = L.seasons.get(ctx.params.id);
    if (!se) throw notFound('Season not found');
    if (se.status !== 'draft') throw conflict('Only draft seasons can be deleted.');
    if (L.fixtures.all({ seasonId: se.id }).length) throw conflict('This season already has fixtures.');
    tx(stores.db, () => { L.divisions.all({ seasonId: se.id }).forEach((d) => L.divisions.delete(d.id)); L.seasons.delete(se.id); audit(ctx.user, 'Draft season deleted', 'season', se.id, se.name); });
    return { ok: true };
  });

  /* ---- fixtures ---- */
  const fixtureSchema = { date: 'date', time: 'time', venueId: 'string', status: Object.keys(C.FIXTURE_STATUS), notes: { type: 'string', optional: true, maxLen: 300 }, announce: { type: 'boolean', optional: true } };
  const fixtureLine = (s, f) => `${f.date} ${f.time} · ${s.venueById.get(f.venueId)?.name} · ${C.FIXTURE_STATUS[f.status]}`;

  app.post('/api/league/admin/fixtures/check', admin, (ctx) => {
    const s = snap(), b = ctx.body || {};
    const existing = b.id ? s.fixById.get(b.id) : null;
    const draft = { ...(existing || { id: '__new', seasonId: activeSeason(s).id, status: 'scheduled', officials: {}, events: [] }), ...b, id: existing?.id || '__new' };
    return { conflicts: C.fixtureConflicts(s, draft) };
  });

  app.post('/api/league/admin/fixtures', admin, (ctx) => {
    const d = validate(ctx.body, { ...fixtureSchema, divisionId: 'string', round: { type: 'number', min: 1, optional: true }, homeId: 'string', awayId: 'string' });
    const s = snap();
    if (d.homeId === d.awayId) throw badRequest('Home and away teams must differ.', { awayId: 'Home and away teams must differ.' });
    const div = s.divById.get(d.divisionId);
    if (!div || !s.teamById.get(d.homeId) || !s.teamById.get(d.awayId) || !s.venueById.get(d.venueId)) throw badRequest('Division, teams and venue must all exist.');
    if (d.status === 'completed') throw badRequest('A new fixture cannot start as completed.');
    const nf = { id: uid('f'), seasonId: activeSeason(s).id, divisionId: d.divisionId, stage: div.format === 'groups-ko' ? 'group' : 'league', round: d.round || 1, homeId: d.homeId, awayId: d.awayId, date: d.date, time: d.time, venueId: d.venueId, status: d.status, notes: d.notes || '', result: null, approval: null, events: [], lineups: null, officials: { ref: null, ar1: null, ar2: null, comm: null }, report: null, attendance: null };
    const conflicts = C.fixtureConflicts(s, nf, s.fixtures);
    if (conflicts.some((c) => c.level === 'block')) throw conflict('Cannot save this fixture.', { conflicts });
    if (conflicts.length && ctx.query.force !== '1') throw conflict('This fixture has scheduling warnings.', { conflicts, canForce: true });
    L.fixtures.insert(nf);
    audit(ctx.user, 'Fixture created', 'fixture', nf.id, '', `${C.teamName(s, nf.homeId)} v ${C.teamName(s, nf.awayId)} · ${nf.date} ${nf.time}`, true);
    return nf;
  });

  app.patch('/api/league/admin/fixtures/:id', admin, (ctx) => {
    const s = snap(), f = s.fixById.get(ctx.params.id);
    if (!f) throw notFound('Match not found');
    const d = validate(ctx.body, fixtureSchema);
    if (d.status === 'completed' && !f.result) throw badRequest('Enter a result before marking a match completed.', { status: 'No result recorded yet.' });
    const next = { ...f, date: d.date, time: d.time, venueId: d.venueId, status: d.status, notes: d.notes || '' };
    const conflicts = C.fixtureConflicts(s, next, s.fixtures);
    if (conflicts.some((c) => c.level === 'block')) throw conflict('Cannot save this fixture.', { conflicts });
    if (conflicts.length && ctx.query.force !== '1') throw conflict('This fixture has scheduling warnings.', { conflicts, canForce: true });
    const before = fixtureLine(s, f);
    tx(stores.db, () => {
      L.fixtures.update(f.id, { date: d.date, time: d.time, venueId: d.venueId, status: d.status, notes: next.notes });
      const after = fixtureLine(s, next);
      if (before !== after) audit(ctx.user, 'Fixture updated', 'fixture', f.id, before, after, true);
      if (d.announce) {
        const ids = C.resolveTeams(s, f);
        L.announcements.insert({ id: uid('a'), cat: 'Fixture change', title: `${C.teamName(s, ids.homeId)} v ${C.teamName(s, ids.awayId)}: ${C.FIXTURE_STATUS[d.status].toLowerCase()}`, body: `${d.date} at ${d.time}, ${s.venueById.get(d.venueId)?.name}.${next.notes ? ` ${next.notes}` : ''}`, audience: 'public', status: 'published', date: today() });
      }
    });
    return L.fixtures.get(f.id);
  });

  app.post('/api/league/admin/fixtures/generate', admin, (ctx) => {
    const d = validate(ctx.body, { name: { type: 'string', minLen: 3, maxLen: 80 }, format: ['single', 'double', 'groups', 'knockout'], teams: 'any', venues: 'any', slots: 'any', start: 'date', gap: { type: 'number', min: 1, max: 28 } });
    const teams = [].concat(d.teams), venues = [].concat(d.venues), slots = [].concat(d.slots);
    if (teams.length < 2) throw badRequest('Select at least two teams.');
    if (!venues.length || !slots.length) throw badRequest('Select at least one venue and one kick-off slot.');
    const s = snap();
    const nameOf = (id) => id.startsWith('app:') ? L.applications.get(id.slice(4))?.name || id : C.teamName(s, id);
    const res = C.generateSchedule({ format: d.format, teamIds: teams, venues, slots, start: d.start, gap: d.gap, nameOf });
    return { name: d.name, format: d.format, ...res };
  });
  app.post('/api/league/admin/drafts', admin, (ctx) => {
    const d = validate(ctx.body, { name: { type: 'string', minLen: 3 }, format: 'string', rows: 'any', conflicts: { type: 'number', optional: true } });
    const draft = { id: uid('dr'), ...d, savedAt: nowISO() };
    L.drafts.insert(draft);
    audit(ctx.user, 'Draft schedule saved', 'draft', draft.id, '', d.name);
    return draft;
  });
  app.delete('/api/league/admin/drafts/:id', admin, (ctx) => {
    if (!L.drafts.delete(ctx.params.id)) throw notFound('Draft not found');
    audit(ctx.user, 'Draft schedule deleted', 'draft', ctx.params.id);
    return { ok: true };
  });

  /* ---- results ---- */
  app.post('/api/league/admin/fixtures/:id/result', admin, (ctx) => {
    const s = snap(), f = s.fixById.get(ctx.params.id);
    if (!f) throw notFound('Match not found');
    const d = validate(ctx.body, { h: { type: 'number', min: 0, max: 30 }, a: { type: 'number', min: 0, max: 30 } });
    if (!C.resolveTeams(s, f).homeId || !C.resolveTeams(s, f).awayId) throw badRequest('Both teams must be known first.');
    L.fixtures.update(f.id, { result: { h: d.h, a: d.a }, status: 'awaiting', approval: 'submitted', report: f.report || { by: null, at: today(), text: 'Result entered by the competition secretary.' } });
    audit(ctx.user, 'Result entered by administrator', 'fixture', f.id, 'No result', `Submitted ${d.h}–${d.a}`);
    return L.fixtures.get(f.id);
  });
  app.patch('/api/league/admin/fixtures/:id/score', admin, (ctx) => {
    const f = L.fixtures.get(ctx.params.id);
    if (!f?.result) throw notFound('No submitted result to correct');
    if (f.status === 'completed') throw conflict('Approved results cannot be edited. Mark it disputed first.');
    const d = validate(ctx.body, { h: { type: 'number', min: 0, max: 30 }, a: { type: 'number', min: 0, max: 30 }, reason: { type: 'string', minLen: 5 } });
    L.fixtures.update(f.id, { result: { ...f.result, h: d.h, a: d.a } });
    audit(ctx.user, 'Score corrected', 'fixture', f.id, `${f.result.h}–${f.result.a}`, `${d.h}–${d.a} (${d.reason})`);
    return L.fixtures.get(f.id);
  });
  app.post('/api/league/admin/fixtures/:id/approve', admin, (ctx) => {
    const f = L.fixtures.get(ctx.params.id);
    if (!f?.result) throw notFound('No submitted result to approve');
    if (!['awaiting', 'review'].includes(f.status)) throw conflict('This result is not waiting for review.');
    const open = L.discipline.all({ matchId: f.id }).filter((c) => OPEN_CASE.includes(c.status));
    if (open.length && ctx.query.force !== '1') throw conflict('An open protest or incident is linked to this match.', { cases: open.map((c) => c.id), canForce: true });
    const before = `${C.FIXTURE_STATUS[f.status]} ${f.result.h}–${f.result.a}`;
    L.fixtures.update(f.id, { status: 'completed', approval: 'approved' });
    audit(ctx.user, 'Result approved', 'fixture', f.id, before, `Approved ${f.result.h}–${f.result.a}`, true);
    return L.fixtures.get(f.id);
  });
  app.post('/api/league/admin/fixtures/:id/dispute', admin, (ctx) => {
    const f = L.fixtures.get(ctx.params.id);
    if (!f?.result) throw notFound('No submitted result');
    L.fixtures.update(f.id, { status: 'review', approval: 'disputed' });
    audit(ctx.user, 'Result marked disputed', 'fixture', f.id, 'Awaiting confirmation', 'Under review');
    return L.fixtures.get(f.id);
  });

  /* ---- officials ---- */
  app.put('/api/league/admin/fixtures/:id/appointments', admin, (ctx) => {
    const s = snap(), f = s.fixById.get(ctx.params.id);
    if (!f) throw notFound('Match not found');
    const picks = ctx.body?.picks || {};
    const chosen = Object.keys(ROLE_KEYS).map((k) => picks[k]).filter(Boolean);
    if (new Set(chosen).size !== chosen.length) throw badRequest('The same official cannot fill two roles in one match.');
    if (chosen.some((id) => !s.offById.has(id))) throw badRequest('Unknown official.');
    const clash = chosen.find((oid) => s.fixtures.some((o) => o.id !== f.id && o.date === f.date && o.time === f.time && Object.values(o.officials || {}).some((a) => a?.id === oid)));
    if (clash) throw conflict(`${s.offById.get(clash).first} ${s.offById.get(clash).last} is already appointed to another match at this time.`);
    const unavailable = chosen.filter((id) => s.offById.get(id).availability === 'unavailable');
    if (unavailable.length && ctx.query.force !== '1') throw conflict('Some officials marked themselves unavailable.', { officials: unavailable, canForce: true });
    const fmt = (o) => Object.entries(o).filter(([, a]) => a).map(([k, a]) => `${k}:${s.offById.get(a.id)?.last}`).join(', ');
    const next = { ...f.officials };
    Object.keys(ROLE_KEYS).forEach((k) => { const v = picks[k]; if (!v) next[k] = null; else if (next[k]?.id !== v) next[k] = { id: v, status: 'pending' }; });
    L.fixtures.update(f.id, { officials: next });
    if (fmt(f.officials || {}) !== fmt(next)) audit(ctx.user, 'Officials appointed', 'fixture', f.id, fmt(f.officials || {}) || 'None', fmt(next) || 'None', true);
    return L.fixtures.get(f.id);
  });
  app.post('/api/league/admin/officials/:id/approve', admin, (ctx) => {
    const o = L.officials.get(ctx.params.id);
    if (!o) throw notFound('Official not found');
    L.officials.update(o.id, { status: 'approved' });
    audit(ctx.user, 'Official registration approved', 'official', o.id, 'Pending', 'Approved', true);
    return L.officials.get(o.id);
  });
  app.post('/api/league/admin/officials/:id/verify', admin, (ctx) => {
    const o = L.officials.get(ctx.params.id);
    if (!o) throw notFound('Official not found');
    const verified = !o.verified;
    L.officials.update(o.id, { verified });
    audit(ctx.user, verified ? 'Qualification verified' : 'Verification removed', 'official', o.id, String(o.verified), String(verified), verified || null);
    return L.officials.get(o.id);
  });

  /* ---- teams, players, transfers ---- */
  app.post('/api/league/admin/applications/:id/decision', admin, (ctx) => {
    const a = L.applications.get(ctx.params.id);
    if (!a) throw notFound('Application not found');
    const d = validate(ctx.body, { status: ['under-review', 'corrections', 'approved', 'rejected', 'withdrawn', 'archived'], note: { type: 'string', minLen: 5, maxLen: 2000 } });
    if (d.status === a.status) throw badRequest('The application already has that status.');
    L.applications.update(a.id, { status: d.status, history: [...a.history, { at: today(), by: `${ctx.user.name} (${ctx.user.role})`, status: d.status, note: d.note }] });
    audit(ctx.user, 'Team application decision', 'application', a.id, a.status, d.status, d.status === 'approved');
    return L.applications.get(a.id);
  });
  app.post('/api/league/admin/teams/:id/withdraw', admin, (ctx) => {
    const t = L.teams.get(ctx.params.id);
    if (!t) throw notFound('Team not found');
    L.teams.update(t.id, { regStatus: 'withdrawn' });
    audit(ctx.user, 'Team withdrawn', 'team', t.id, 'Approved', 'Withdrawn', true);
    return L.teams.get(t.id);
  });
  app.post('/api/league/admin/teams/:id/reinstate', admin, (ctx) => {
    const t = L.teams.get(ctx.params.id);
    if (!t) throw notFound('Team not found');
    L.teams.update(t.id, { regStatus: 'approved' });
    audit(ctx.user, 'Team reinstated', 'team', t.id, t.regStatus, 'Approved', true);
    return L.teams.get(t.id);
  });
  app.post('/api/league/admin/registrations/:id/decision', admin, (ctx) => {
    const r = L.registrations.get(ctx.params.id);
    if (!r) throw notFound('Registration not found');
    const { to } = validate(ctx.body, { to: ['approved', 'rejected'] });
    const p = L.players.get(r.playerId);
    if (to === 'approved' && ctx.query.force !== '1') {
      const dup = L.registrations.all({ seasonId: r.seasonId, status: 'approved' }).find((x) => x.id !== r.id && L.players.get(x.playerId)?.first === p.first && L.players.get(x.playerId)?.last === p.last);
      if (dup) throw conflict(`A player called ${p.first} ${p.last} is already registered with ${L.teams.get(dup.teamId)?.name}.`, { possibleDuplicate: dup.id, canForce: true });
    }
    L.registrations.update(r.id, { status: to, decided: today() });
    audit(ctx.user, `Registration ${to}`, 'registration', r.id, 'Pending', `${to}: ${p.first} ${p.last} (${L.teams.get(r.teamId)?.name})`, to === 'approved');
    return L.registrations.get(r.id);
  });
  app.post('/api/league/admin/transfers/:id/decision', admin, (ctx) => {
    const tr = L.transfers.get(ctx.params.id);
    if (!tr) throw notFound('Transfer not found');
    if (tr.status !== 'pending') throw conflict('This transfer has already been decided.');
    const { to } = validate(ctx.body, { to: ['approved', 'rejected'] });
    const sid = activeSeason(snap()).id;
    tx(stores.db, () => {
      L.transfers.update(tr.id, { status: to });
      if (to === 'approved') {
        const old = L.registrations.all({ playerId: tr.playerId, teamId: tr.fromTeam, status: 'approved' })[0];
        if (old) L.registrations.update(old.id, { status: 'transferred' });
        const used = new Set(L.registrations.all({ teamId: tr.toTeam, status: 'approved' }).map((r) => r.number));
        let num = old?.number || 20; while (used.has(num)) num++;
        L.registrations.insert({ id: uid('r'), playerId: tr.playerId, teamId: tr.toTeam, seasonId: sid, number: num, status: 'approved', submitted: today() });
      }
      audit(ctx.user, `Transfer ${to}`, 'transfer', tr.id, L.teams.get(tr.fromTeam)?.name, to === 'approved' ? L.teams.get(tr.toTeam)?.name : 'Rejected', to === 'approved');
    });
    return L.transfers.get(tr.id);
  });

  /* ---- discipline ---- */
  app.post('/api/league/admin/discipline', admin, (ctx) => {
    const d = validate(ctx.body, { type: ['Misconduct', 'Suspension', 'Team sanction', 'Match incident', 'Protest', 'Appeal'], category: { type: 'string', minLen: 3, maxLen: 120 }, matchId: { type: 'string', optional: true }, teamId: { type: 'string', optional: true }, playerId: { type: 'string', optional: true }, note: { type: 'string', minLen: 10, maxLen: 4000 } });
    const c = { id: uid('dc'), type: d.type, category: d.category, date: today(), matchId: d.matchId || null, teamId: d.teamId || null, playerId: d.playerId || null, status: 'submitted', decision: '', public: false, history: [{ at: today(), by: `${ctx.user.name} (${ctx.user.role})`, status: 'submitted', note: d.note, internal: true }] };
    L.discipline.insert(c);
    audit(ctx.user, 'Case opened', 'discipline', c.id, '', `${d.type}: ${d.category}`);
    return c;
  });
  app.patch('/api/league/admin/discipline/:id', admin, (ctx) => {
    const c = L.discipline.get(ctx.params.id);
    if (!c) throw notFound('Case not found');
    const d = validate(ctx.body, { status: CASE_STATUSES, decision: { type: 'string', optional: true, maxLen: 500 }, public: { type: 'boolean', optional: true }, note: { type: 'string', minLen: 5, maxLen: 4000 } });
    L.discipline.update(c.id, { status: d.status, decision: d.decision || '', public: !!d.public, history: [...c.history, { at: today(), by: `${ctx.user.name} (${ctx.user.role})`, status: d.status, note: d.note, internal: !d.public }] });
    audit(ctx.user, 'Case updated', 'discipline', c.id, c.status, `${d.status}${d.decision ? `: ${d.decision}` : ''}`, ['upheld', 'resolved'].includes(d.status) || null);
    return L.discipline.get(c.id);
  });

  /* ---- content: announcements, news, documents, sponsors ---- */
  function content(path, repo, label, entity, schema, build, { publish = true } = {}) {
    app.post(`/api/league/admin/${path}`, admin, (ctx) => {
      const rec = build(validate(ctx.body, schema));
      repo.insert(rec);
      audit(ctx.user, `${label} created`, entity, rec.id, '', rec.title || rec.name);
      return rec;
    });
    app.patch(`/api/league/admin/${path}/:id`, admin, (ctx) => {
      const cur = repo.get(ctx.params.id);
      if (!cur) throw notFound(`${label} not found`);
      const to = ctx.body?.status ?? ctx.body?.visibility;
      const patch = validate(ctx.body, Object.fromEntries(Object.entries(schema).map(([k, v]) => [k, typeof v === 'string' ? `${v.replace('?', '')}?` : Array.isArray(v) ? { type: 'enum', values: v, optional: true } : { ...v, optional: true }])));
      repo.update(cur.id, patch);
      audit(ctx.user, publish && patch.status ? `${label} ${patch.status === 'published' || patch.status === 'active' ? 'published' : 'unpublished'}` : `${label} updated`, entity, cur.id, cur.status || cur.visibility || '', to || '', null);
      return repo.get(cur.id);
    });
    app.delete(`/api/league/admin/${path}/:id`, admin, (ctx) => {
      const cur = repo.get(ctx.params.id);
      if (!cur) throw notFound(`${label} not found`);
      repo.delete(cur.id);
      audit(ctx.user, `${label} deleted`, entity, cur.id, cur.title || cur.name, '');
      return { ok: true };
    });
  }
  content('announcements', L.announcements, 'Announcement', 'announcement',
    { cat: { type: 'string', maxLen: 60 }, title: { type: 'string', minLen: 3, maxLen: 160 }, body: { type: 'string', minLen: 5, maxLen: 4000 }, audience: { type: 'string', optional: true }, status: ['draft', 'published'] },
    (d) => ({ id: uid('a'), audience: 'public', ...d, date: today() }));
  content('news', L.news, 'Story', 'news',
    { cat: { type: 'string', maxLen: 60 }, title: { type: 'string', minLen: 3, maxLen: 160 }, dek: { type: 'string', maxLen: 300 }, body: 'any', photo: { type: 'string', optional: true }, status: ['draft', 'published'] },
    (d) => ({ id: uid('n'), teamIds: [], matchId: null, photo: 'ball', ...d, body: [].concat(d.body || []), date: today() }));
  content('documents', L.documents, 'Document', 'document',
    { title: { type: 'string', minLen: 3, maxLen: 160 }, cat: { type: 'string', maxLen: 60 }, version: { type: 'string', optional: true, maxLen: 30 }, visibility: ['public', 'restricted'], status: ['draft', 'published'], scope: { type: 'string', optional: true }, outline: { type: 'any', optional: true } },
    (d) => ({ id: uid('doc'), version: '0.1', scope: 'League', outline: [], published: today(), effective: today(), review: '', url: null, seasonId: activeSeason(snap()).id, ...d }), { publish: false });
  content('sponsors', L.sponsors, 'Partner', 'sponsor',
    { name: { type: 'string', minLen: 2, maxLen: 120 }, tier: { type: 'string', maxLen: 60 }, placements: 'any', status: ['active', 'inactive'], fictional: { type: 'boolean', optional: true } },
    (d) => ({ id: uid('sp'), fictional: false, ...d, placements: [].concat(d.placements || []) }));
}
