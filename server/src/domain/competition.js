import { roundRobin } from '../seed/jflGenerator.js';

/* Pure competition rules, ported from the league demo. Everything works on plain arrays so it is easy to test.
   A "snapshot" is { config, divisions, teams, fixtures, registrations, discipline, players, venues, officials }. */

export const FIXTURE_STATUS = { scheduled: 'Scheduled', awaiting: 'Awaiting confirmation', live: 'In progress', completed: 'Completed', postponed: 'Postponed', cancelled: 'Cancelled', abandoned: 'Abandoned', review: 'Under review' };

export const isOfficial = (f) => f.status === 'completed' && f.approval === 'approved';
const isoToday = () => new Date().toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.abs((Date.parse(a) - Date.parse(b)) / 864e5);

export function snapshotIndex(s) {
  const byId = (arr) => new Map(arr.map((x) => [x.id, x]));
  return { ...s, teamById: byId(s.teams), divById: byId(s.divisions), fixById: byId(s.fixtures), playerById: byId(s.players), venueById: byId(s.venues), offById: byId(s.officials) };
}

export const teamName = (s, id) => s.teamById.get(id)?.name || '';

/* ---- knockout slots: "A1", "B2", "W:fixtureId" resolve once feeding results are approved ---- */
function koWinner(s, f) {
  if (!isOfficial(f)) return null;
  const { h, a, pens } = f.result, ids = resolveTeams(s, f);
  if (h !== a) return h > a ? ids.homeId : ids.awayId;
  return pens ? (pens[0] > pens[1] ? ids.homeId : ids.awayId) : null;
}
const groupFixtures = (s, div, g) => s.fixtures.filter((f) => f.divisionId === div.id && f.stage === 'group' && f.group === g);
export const groupTable = (s, div, g) => standings(s, div.groups[g], groupFixtures(s, div, g));
const groupComplete = (s, div, g) => groupFixtures(s, div, g).every(isOfficial);

export function resolveSlot(s, f, slot) {
  if (!slot) return null;
  const div = s.divById.get(f.divisionId);
  if (slot.startsWith('W:')) { const src = s.fixById.get(slot.slice(2)); return src ? koWinner(s, src) : null; }
  const g = slot[0], pos = Number(slot[1]);
  if (!div?.groups || !groupComplete(s, div, g)) return null;
  return groupTable(s, div, g)[pos - 1]?.id || null;
}
export function resolveTeams(s, f) {
  return { homeId: f.homeId || resolveSlot(s, f, f.slotH), awayId: f.awayId || resolveSlot(s, f, f.slotA) };
}

/* ---- standings ---- */
export function standings(s, teamIds, fixtures) {
  const P = s.config.points;
  const rows = new Map(teamIds.map((id) => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]));
  const played = fixtures.filter((f) => isOfficial(f) && rows.has(f.homeId) && rows.has(f.awayId)).sort((a, b) => a.date.localeCompare(b.date));
  played.forEach((f) => {
    const h = rows.get(f.homeId), a = rows.get(f.awayId), { h: gh, a: ga } = f.result;
    h.p++; a.p++; h.gf += gh; h.ga += ga; a.gf += ga; a.ga += gh;
    if (gh > ga) { h.w++; a.l++; h.pts += P.w; a.pts += P.l; h.form.push('W'); a.form.push('L'); }
    else if (gh < ga) { a.w++; h.l++; a.pts += P.w; h.pts += P.l; h.form.push('L'); a.form.push('W'); }
    else { h.d++; a.d++; h.pts += P.d; a.pts += P.d; h.form.push('D'); a.form.push('D'); }
  });
  const list = [...rows.values()].map((r) => ({ ...r, gd: r.gf - r.ga, form: r.form.slice(-5) }));
  const h2h = (x, y) => played.filter((f) => (f.homeId === x && f.awayId === y) || (f.homeId === y && f.awayId === x))
    .reduce((sum, f) => { const xh = f.homeId === x; const gx = xh ? f.result.h : f.result.a, gy = xh ? f.result.a : f.result.h; return sum + (gx > gy ? P.w : gx === gy ? P.d : P.l); }, 0);
  const crit = { gd: (a, b) => b.gd - a.gd, gf: (a, b) => b.gf - a.gf, wins: (a, b) => b.w - a.w, h2h: (a, b) => h2h(b.id, a.id) - h2h(a.id, b.id) };
  list.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    for (const k of s.config.tiebreak) { const v = crit[k] ? crit[k](a, b) : 0; if (v) return v; }
    return teamName(s, a.id).localeCompare(teamName(s, b.id));
  });
  return list.map((r, i) => ({ ...r, pos: i + 1 }));
}

export const divisionTeamIds = (s, divId) => s.teams.filter((t) => t.divisionId === divId && ['approved', 'archived'].includes(t.regStatus)).map((t) => t.id);

export function divisionTables(s, divId) {
  const div = s.divById.get(divId);
  if (!div) return null;
  if (div.groups) return { format: div.format, groups: Object.fromEntries(Object.keys(div.groups).map((g) => [g, groupTable(s, div, g)])) };
  return { format: div.format, table: standings(s, divisionTeamIds(s, divId), s.fixtures.filter((f) => f.divisionId === divId)) };
}

/* ---- statistics from approved matches ---- */
export function playerStats(s, { seasonId = null, divisionId = null, teamId = null } = {}) {
  const map = new Map();
  const get = (pid, tid) => { if (!map.has(pid)) map.set(pid, { playerId: pid, teamId: tid, apps: 0, goals: 0, yellow: 0, red: 0, cs: 0 }); return map.get(pid); };
  s.fixtures.filter((f) => isOfficial(f) && (!seasonId || f.seasonId === seasonId) && (!divisionId || f.divisionId === divisionId)).forEach((f) => {
    const ids = resolveTeams(s, f);
    [['h', ids.homeId, f.result.a], ['a', ids.awayId, f.result.h]].forEach(([side, tid, conceded]) => {
      if (teamId && tid !== teamId) return;
      (f.lineups?.[side] || []).forEach((pid, i) => { const st = get(pid, tid); st.apps++; if (i === 0 && conceded === 0) st.cs++; });
    });
    f.events.forEach((e) => {
      if (teamId && e.teamId !== teamId) return;
      const st = get(e.playerId, e.teamId);
      if (e.type === 'goal') st.goals++; else if (e.type === 'yellow') st.yellow++; else if (e.type === 'red') st.red++;
    });
  });
  return [...map.values()];
}

export function teamStats(s, fixtures, teamIds) {
  return teamIds.map((id) => {
    const fx = fixtures.filter((f) => isOfficial(f) && [resolveTeams(s, f).homeId, resolveTeams(s, f).awayId].includes(id));
    let gf = 0, ga = 0, cs = 0, y = 0, r = 0;
    fx.forEach((f) => {
      const home = resolveTeams(s, f).homeId === id;
      const a = home ? f.result.h : f.result.a, b = home ? f.result.a : f.result.h;
      gf += a; ga += b; if (b === 0) cs++;
      f.events.forEach((e) => { if (e.teamId === id) { if (e.type === 'yellow') y++; if (e.type === 'red') r++; } });
    });
    return { id, played: fx.length, gf, ga, cs, y, r, gpg: fx.length ? gf / fx.length : 0 };
  });
}

/* ---- players ---- */
const activeSeason = (s) => s.seasons.find((x) => x.status === 'active') || s.seasons[0];
export const isSuspended = (s, pid) => s.discipline.some((d) => d.playerId === pid && d.type === 'Suspension' && ['submitted', 'under-review', 'upheld'].includes(d.status));
export function eligibility(s, pid) {
  const cur = s.registrations.find((r) => r.playerId === pid && r.seasonId === activeSeason(s).id && r.status === 'approved');
  if (!cur) return s.registrations.some((x) => x.playerId === pid && x.status === 'pending') ? 'pending' : 'inactive';
  return isSuspended(s, pid) ? 'suspended' : 'eligible';
}

/* ---- scheduling conflicts: 'block' stops the save, 'warn' needs confirmation ---- */
export function fixtureConflicts(s, f, list = s.fixtures) {
  const out = [];
  if (['postponed', 'cancelled'].includes(f.status) || !f.date) return out;
  const ids = resolveTeams(s, f);
  const others = list.filter((o) => o.id !== f.id && !['postponed', 'cancelled'].includes(o.status));
  [ids.homeId, ids.awayId].filter(Boolean).forEach((tid) => {
    others.forEach((o) => {
      const oi = resolveTeams(s, o);
      if (![oi.homeId, oi.awayId].includes(tid)) return;
      const gap = dayDiff(o.date, f.date);
      if (gap === 0) out.push({ level: 'block', teamId: tid, otherId: o.id, msg: `${teamName(s, tid)} already plays on ${f.date} (${teamName(s, oi.homeId)} v ${teamName(s, oi.awayId)}).` });
      else if (gap < s.config.minRestDays) out.push({ level: 'warn', teamId: tid, otherId: o.id, msg: `${teamName(s, tid)} has only ${gap} day(s) rest (minimum ${s.config.minRestDays}).` });
    });
  });
  others.filter((o) => o.venueId === f.venueId && o.date === f.date && o.time === f.time).forEach((o) => {
    out.push({ level: 'warn', otherId: o.id, msg: `${s.venueById.get(f.venueId)?.name || 'The venue'} already hosts ${teamName(s, resolveTeams(s, o).homeId) || 'a match'} v ${teamName(s, resolveTeams(s, o).awayId) || 'TBC'} at ${f.time}.` });
  });
  return out;
}

/* ---- fixture generator (preview only; drafts never touch live fixtures) ---- */
export function generateSchedule({ format, teamIds, venues, slots, start, gap, nameOf }) {
  let rounds = [];
  if (format === 'single' || format === 'double') rounds = roundRobin(teamIds, format === 'double').map((p, i) => ({ label: `Round ${i + 1}`, pairs: p }));
  else if (format === 'groups') {
    const A = teamIds.filter((_, i) => i % 2 === 0), B = teamIds.filter((_, i) => i % 2 === 1);
    const ra = roundRobin(A), rb = roundRobin(B);
    for (let i = 0; i < Math.max(ra.length, rb.length); i++) rounds.push({ label: `Groups R${i + 1}`, pairs: [...(ra[i] || []), ...(rb[i] || [])] });
  } else {
    const pairs = []; for (let i = 0; i + 1 < teamIds.length; i += 2) pairs.push([teamIds[i], teamIds[i + 1]]);
    rounds = [{ label: 'First round', pairs }];
  }
  const cap = venues.length * slots.length;
  const rows = []; let conflicts = 0;
  rounds.forEach((r, ri) => {
    const date = new Date(Date.parse(start) + ri * gap * 864e5).toISOString().slice(0, 10);
    r.pairs.forEach(([h, a], mi) => {
      const ok = mi < cap;
      if (!ok) conflicts++;
      rows.push({ round: r.label, date, time: ok ? slots[mi % slots.length] : null, venue: ok ? venues[Math.floor(mi / slots.length)] : null, homeId: h, awayId: a, home: nameOf(h), away: nameOf(a), conflict: !ok });
    });
  });
  return { rows, conflicts };
}

export const todayISO = isoToday;
