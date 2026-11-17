// Generated from the Jalingo Football League demo (buildSeed + helpers). Deterministic, relative to today's date.
export const DATA_VERSION = 3;

/* =========================================================
   JALINGO FOOTBALL LEAGUE: DEMONSTRATION DATA MODEL
   Everything below is illustrative. The seed is generated
   deterministically (fixed random seed) relative to today's
   date, so the season always appears to be in progress.
   One central state object powers every view.
   ========================================================= */

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const pad2 = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

// Verified-loading Unsplash photos. All illustrative, none are of real league matches.
const PHOTOS = {
  night: '1431324155629-1a6deb1dec8d', duel: '1553778263-73a83bab9b0c', dirt: '1606925797300-0b35e9d1794e',
  amateur: '1543326727-cf6c39e8f84c', amateur2: '1624880357913-a8539238245b', aerial: '1509077613385-f89402467146',
  balls: '1551958219-acbc608c6377', kick: '1560272564-c83b66b1ad12', boots: '1511886929837-354d827aae26',
  net: '1587329310686-91414b8e3cb7', tunnel: '1577223625816-7546f13df25d', line: '1459865264687-595d652de67e',
  touch: '1600679472829-3044539ce8ed', keeper: '1517466787929-bc90951d0974', ball: '1574629810360-7efbbe195018',
  dusk: '1614632537197-38a17061c2bd', ball2: '1579952363873-27f3bade9f55', pitch: '1556056504-5c7696c4c28d'
};

const CLUBS = [
  { id: 'cre', name: 'Crescent United', short: 'CRE', c1: '#1f4fbf', c2: '#f2c230', shape: 'shield', motif: 'chevron', strength: .74,
    bio: 'A possession-minded side built around a young midfield. Illustrative club profile.' },
  { id: 'sav', name: 'Savannah Stars', short: 'SAV', c1: '#c2410c', c2: '#111827', shape: 'round', motif: 'star', strength: .6,
    bio: 'Direct, quick and dangerous on the counter. Illustrative club profile.' },
  { id: 'irn', name: 'Ironbridge FC', short: 'IRN', c1: '#334155', c2: '#e8452c', shape: 'shield', motif: 'bar', strength: .55,
    bio: 'Organised and hard to beat, with a reputation for late goals. Illustrative club profile.' },
  { id: 'grn', name: 'Greenfield Rovers', short: 'GRN', c1: '#15803d', c2: '#ffffff', shape: 'shield', motif: 'hoops', strength: .7,
    bio: 'A community club with a strong youth intake. Illustrative club profile.' },
  { id: 'hhk', name: 'Highland Hawks', short: 'HHK', c1: '#7c2d12', c2: '#fbbf24', shape: 'pointed', motif: 'diag', strength: .5,
    bio: 'Energetic pressing team with a settled back line. Illustrative club profile.' },
  { id: 'riv', name: 'Riverline Athletic', short: 'RIV', c1: '#0e7490', c2: '#e0f2fe', shape: 'round', motif: 'wave', strength: .46,
    bio: 'Technical, patient and still building. Illustrative club profile.' },
  { id: 'ngw', name: 'Northgate Warriors', short: 'NGW', c1: '#581c87', c2: '#f5f3ff', shape: 'pointed', motif: 'stripes', strength: .42,
    bio: 'A newly formed squad combining experienced players and first-timers. Illustrative club profile.' },
  { id: 'uni', name: 'Unity Sporting', short: 'UNI', c1: '#b91c1c', c2: '#ffffff', shape: 'shield', motif: 'half', strength: .66,
    bio: 'Strong in the air and dangerous from set pieces. Illustrative club profile.' }
];

const FIRST = ['Abdullahi', 'Musa', 'Ibrahim', 'Yakubu', 'Emmanuel', 'Daniel', 'Samuel', 'Joseph', 'Sani', 'Bello', 'Aliyu', 'Usman',
  'Chinedu', 'Tunde', 'Femi', 'Ifeanyi', 'Danjuma', 'Ishaku', 'Bitrus', 'Haruna', 'Garba', 'Tanko', 'Nuhu', 'Solomon', 'Peter',
  'Godwin', 'Kabiru', 'Habibu', 'Victor', 'Josiah', 'Elisha', 'Amos', 'Yusuf', 'Adamu', 'Shehu', 'Jonah', 'Caleb', 'Timothy',
  'Kefas', 'Zakari', 'Isah', 'Lawal', 'Obinna', 'Kelechi', 'Sunday', 'Paul', 'Simon', 'Dauda', 'Hamza', 'Silas', 'Gideon', 'Ezra'];
const LAST = ['Bako', 'Danladi', 'Gambo', 'Tukur', 'Audu', 'Ayuba', 'Iliya', 'Jatau', 'Kwaji', 'Magaji', 'Sule', 'Yohanna', 'Zakka',
  'Bulus', 'Dogo', 'Gani', 'Hassan', 'Ishaya', 'Jibrin', 'Lamido', 'Maikano', 'Ojo', 'Okafor', 'Sabo', 'Tanimu', 'Umar', 'Waziri',
  'Zubairu', 'Adeyemi', 'Eze', 'Philemon', 'Agbu', 'Akwe', 'Gidado', 'Ndam', 'Garba', 'Kente', 'Shuaibu', 'Nwosu', 'Danbaba',
  'Tsoho', 'Manu', 'Kuku', 'Bawa', 'Ezekiel', 'Ladan', 'Njoku', 'Yerima'];

const SENIOR_SHAPE = [['GK', 1], ['GK', 16], ['DEF', 2], ['DEF', 3], ['DEF', 4], ['DEF', 5], ['DEF', 15], ['MID', 6], ['MID', 8], ['MID', 10], ['MID', 14], ['FWD', 7], ['FWD', 9], ['FWD', 11]];
const YOUTH_SHAPE = [['GK', 1], ['GK', 12], ['DEF', 2], ['DEF', 3], ['DEF', 4], ['DEF', 5], ['MID', 6], ['MID', 8], ['MID', 10], ['MID', 14], ['FWD', 7], ['FWD', 9], ['FWD', 11]];

/* Round-robin pairings using the circle method. Also used by the admin fixture generator. */
function roundRobin(ids, double = false) {
  const t = [...ids];
  if (t.length % 2) t.push(null);
  const n = t.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i], b = t[n - 1 - i];
      if (a && b) pairs.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    t.splice(1, 0, t.pop());
  }
  if (double) rounds.push(...rounds.map((p) => p.map(([a, b]) => [b, a])));
  return rounds;
}

function buildSeed() {
  const rng = mulberry32(20261031);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const poisson = (lam) => { let L = Math.exp(-lam), k = 0, p = 1; do { k++; p *= rng(); } while (p > L); return Math.min(k - 1, 5); };

  const t0 = today0();
  const lastSat = addDays(t0, -(((t0.getDay() + 1) % 7) || 7));
  const usedNames = new Set();
  const personName = () => {
    let n;
    do { n = [pick(FIRST), pick(LAST)]; } while (usedNames.has(n.join(' ')));
    usedNames.add(n.join(' '));
    return n;
  };

  const S = {
    version: DATA_VERSION,
    seededAt: new Date().toISOString(),
    config: {
      compName: 'Jalingo Football League', shortName: 'JFL', tagline: 'Every match counts.',
      status: 'Provisional identity · structure awaiting organiser confirmation',
      points: { w: 3, d: 1, l: 0 }, tiebreak: ['gd', 'gf', 'h2h'],
      matchDuration: { senior: 90, youth: 70 },
      squadMin: '', squadMax: '', maxRegistrationsPerSeason: '1 team per season (illustrative)',
      regOpen: isoDate(addDays(t0, -75)), regClose: isoDate(addDays(t0, 20)),
      eligibility: 'Age limits, residency and quota rules are awaiting organiser confirmation.',
      kickoffSlots: ['10:00', '12:00', '14:00', '16:30'],
      minRestDays: 2
    },
    seasons: [
      { id: 's26', name: '2026/27 Season', label: 'Inaugural season', status: 'active', start: isoDate(addDays(lastSat, -21)), end: isoDate(addDays(lastSat, 120)) },
      { id: 's25', name: '2025 Invitational', label: 'Illustrative archive example', status: 'archived', illustrative: true, start: isoDate(addDays(t0, -300)), end: isoDate(addDays(t0, -286)) }
    ],
    divisions: [
      { id: 'd-sen', seasonId: 's26', name: 'Senior Division', short: 'Senior', category: 'Senior · Men', format: 'single-rr', status: 'active', duration: 90 },
      { id: 'd-u17', seasonId: 's26', name: 'Under-17 Cup', short: 'U17 Cup', category: 'Youth · Under-17', format: 'groups-ko', status: 'active', duration: 70, groups: { A: [], B: [] }, advance: 2 },
      { id: 'd-wom', seasonId: 's26', name: "Women's Division", short: 'Women', category: 'Senior · Women', format: 'tbc', status: 'proposed', duration: 90 },
      { id: 'd-inv', seasonId: 's25', name: 'Invitational Cup', short: 'Invitational', category: 'Senior · Men', format: 'knockout', status: 'archived', duration: 90 }
    ],
    clubs: CLUBS.map(({ strength, ...c }) => ({ ...c, community: null, founded: null, colours: null })),
    teams: [], players: [], registrations: [], staff: [], officials: [], venues: [], fixtures: [],
    discipline: [], applications: [], transfers: [], news: [], announcements: [], documents: [], sponsors: [],
    awards: [], audit: [], volunteers: [], generatedDrafts: [], enquiries: 0,
    ui: { role: 'public', roleTeam: 't-cre-s', rolePlayer: null, roleOfficial: 'o03', favTeam: null }
  };

  /* ---------- Venues (names deliberately generic until confirmed) ---------- */
  const facilityList = (o) => [['Changing rooms', o[0]], ['Floodlights', o[1]], ['Spectator seating', o[2]], ['First-aid point', o[3]], ['Parking', o[4]], ['Toilets', o[5]]].map(([k, s]) => ({ k, s }));
  S.venues = [
    { id: 'v-main', name: 'Main Venue', status: 'provisional', area: 'Jalingo · exact location awaiting confirmation', capacity: null, surface: 'Grass (to be confirmed)', facilities: facilityList(['tbc', 'tbc', 'tbc', 'tbc', 'tbc', 'tbc']), notes: 'Proposed main venue for Senior Division matches.' },
    { id: 'v-north', name: 'North Pitch', status: 'provisional', area: 'Jalingo · exact location awaiting confirmation', capacity: null, surface: 'Grass (to be confirmed)', facilities: facilityList(['tbc', 'no', 'tbc', 'tbc', 'tbc', 'tbc']), notes: 'Proposed second venue for Senior Division matches.' },
    { id: 'v-comm', name: 'Community Pitch', status: 'provisional', area: 'Jalingo · exact location awaiting confirmation', capacity: null, surface: 'Natural surface (to be confirmed)', facilities: facilityList(['tbc', 'no', 'tbc', 'tbc', 'tbc', 'tbc']), notes: 'Proposed venue for youth matches.' }
  ];

  /* ---------- Teams, staff, players and registrations ---------- */
  let pCount = 0, rCount = 0;
  const newPlayer = (pos, birthYear) => {
    const [first, last] = personName();
    const p = { id: `p${String(++pCount).padStart(3, '0')}`, first, last, pos, birthYear, bio: null, photoConsent: false };
    S.players.push(p);
    return p;
  };
  const register = (playerId, teamId, seasonId, number, status = 'approved', extra = {}) => {
    const r = { id: `r${String(++rCount).padStart(4, '0')}`, playerId, teamId, seasonId, number, status, submitted: S.seasons.find((s) => s.id === seasonId).start, ...extra };
    S.registrations.push(r);
    return r;
  };

  CLUBS.forEach((c) => {
    const sen = { id: `t-${c.id}-s`, clubId: c.id, divisionId: 'd-sen', seasonId: 's26', name: c.name, regStatus: 'approved', strength: c.strength };
    const yth = { id: `t-${c.id}-y`, clubId: c.id, divisionId: 'd-u17', seasonId: 's26', name: `${c.name} U17`, regStatus: 'approved', strength: c.strength - .05 };
    const inv = { id: `t-${c.id}-i`, clubId: c.id, divisionId: 'd-inv', seasonId: 's25', name: c.name, regStatus: 'archived', strength: c.strength };
    S.teams.push(sen, yth, inv);
    [['Head coach', sen.id], ['Team representative', sen.id], ['Assistant coach', sen.id], ['Head coach', yth.id], ['Team representative', yth.id]].forEach(([role, teamId]) => {
      const [first, last] = personName();
      S.staff.push({ id: `st-${c.id}-${S.staff.length}`, first, last, role, teamId });
    });
    SENIOR_SHAPE.forEach(([pos, num]) => {
      const p = newPlayer(pos, 1992 + Math.floor(rng() * 12));
      register(p.id, sen.id, 's26', num);
      if (rng() < .75) register(p.id, inv.id, 's25', num);
    });
    // Former players: appeared in the 2025 archive example only.
    for (let i = 0; i < 3; i++) {
      const pos = ['DEF', 'MID', 'FWD'][i];
      const p = newPlayer(pos, 1990 + Math.floor(rng() * 10));
      register(p.id, inv.id, 's25', [17, 18, 19][i]);
    }
    YOUTH_SHAPE.forEach(([pos, num]) => {
      const p = newPlayer(pos, 2010 + Math.floor(rng() * 2));
      register(p.id, yth.id, 's26', num);
    });
  });

  // A player who moved clubs between the archive example and the current season.
  const mover = S.registrations.find((r) => r.teamId === 't-riv-i' && r.number === 18);
  register(mover.playerId, 't-grn-s', 's26', 18, 'approved');

  /* ---------- Officials ---------- */
  const OFFICIAL_ROLES = [
    ['Referee', 9], ['Referee', 7], ['Referee', 6], ['Referee', 4], ['Referee', 3],
    ['Assistant referee', 5], ['Assistant referee', 4], ['Assistant referee', 3], ['Assistant referee', 2], ['Assistant referee', 2],
    ['Match commissioner', 11], ['Match commissioner', 8]
  ];
  OFFICIAL_ROLES.forEach(([role, years], i) => {
    const [first, last] = personName();
    S.officials.push({
      id: `o${pad2(i + 1)}`, first, last, role, roles: role === 'Referee' ? ['Referee', 'Assistant referee'] : [role],
      qualification: role === 'Match commissioner' ? 'Match administration experience (declared)' : `${role} course certificate (declared)`,
      verified: false, experience: years, status: 'approved', availability: i === 4 ? 'limited' : 'available'
    });
  });
  const pendingOff = personName();
  S.officials.push({ id: 'o13', first: pendingOff[0], last: pendingOff[1], role: 'Assistant referee', roles: ['Assistant referee'], qualification: 'Assistant referee course certificate (declared)', verified: false, experience: 1, status: 'pending', availability: 'available' });

  /* ---------- Match helpers ---------- */
  const regsFor = (teamId) => S.registrations.filter((r) => r.teamId === teamId && r.status === 'approved')
    .map((r) => ({ ...S.players.find((p) => p.id === r.playerId), number: r.number }));
  const starters = (teamId, round) => {
    const sq = regsFor(teamId);
    const by = (pos) => sq.filter((p) => p.pos === pos);
    const def = by('DEF'), mid = by('MID'), fwd = by('FWD');
    const d = round % 2 && def[4] ? [def[0], def[1], def[2], def[4]] : def.slice(0, 4);
    const f = round % 3 === 0 && fwd[2] ? [fwd[0], fwd[2]] : fwd.slice(0, 2);
    return [by('GK')[0], ...d, ...mid.slice(0, 4), ...f].filter(Boolean).map((p) => p.id);
  };
  const scorerFrom = (ids) => {
    const w = ids.map((id) => ({ id, w: { FWD: 5, MID: 2.2, DEF: .6, GK: 0 }[S.players.find((p) => p.id === id).pos] }));
    let r = rng() * w.reduce((s, x) => s + x.w, 0);
    for (const x of w) { if ((r -= x.w) <= 0) return x.id; }
    return w[0].id;
  };
  const teamOf = (id) => S.teams.find((t) => t.id === id);

  let fxCount = 0;
  const makeFixture = (o) => {
    const f = { id: `f${String(++fxCount).padStart(3, '0')}`, status: 'scheduled', result: null, approval: null, events: [], lineups: null,
      officials: { ref: null, ar1: null, ar2: null, comm: null }, report: null, attendance: null, notes: '', ...o };
    S.fixtures.push(f);
    return f;
  };
  // Generates a plausible score, line-ups and events for a played match (up to `upTo` minutes).
  const play = (f, { upTo = 90, forceWinner = false, scoreOverride = null } = {}) => {
    const H = teamOf(f.homeId), A = teamOf(f.awayId);
    f.lineups = { h: starters(H.id, f.round || 1), a: starters(A.id, f.round || 1) };
    let gh = poisson(Math.max(.25, 1.15 + (H.strength - A.strength) * 2.2 + .2));
    let ga = poisson(Math.max(.25, 1.0 + (A.strength - H.strength) * 2.2));
    if (scoreOverride) [gh, ga] = scoreOverride;
    if (forceWinner && gh === ga) { if (H.strength >= A.strength) gh++; else ga++; }
    const ev = [];
    const minute = () => 1 + Math.floor(rng() * (upTo - 1));
    for (let i = 0; i < gh; i++) ev.push({ min: minute(), type: 'goal', teamId: H.id, playerId: scorerFrom(f.lineups.h) });
    for (let i = 0; i < ga; i++) ev.push({ min: minute(), type: 'goal', teamId: A.id, playerId: scorerFrom(f.lineups.a) });
    [[H, f.lineups.h], [A, f.lineups.a]].forEach(([T, ids]) => {
      const n = rng() < .35 ? 0 : rng() < .7 ? 1 : 2;
      for (let i = 0; i < n; i++) ev.push({ min: minute(), type: 'yellow', teamId: T.id, playerId: ids[1 + Math.floor(rng() * 10)] });
    });
    ev.sort((a, b) => a.min - b.min);
    f.events = ev;
    f.result = { h: gh, a: ga };
    return f;
  };
  const appoint = (f, ids, status = 'confirmed') => {
    ['ref', 'ar1', 'ar2', 'comm'].forEach((k, i) => { if (ids[i]) f.officials[k] = { id: ids[i], status }; });
  };
  const refReport = (f) => {
    const H = teamOf(f.homeId), A = teamOf(f.awayId);
    return `Match played in good spirit. ${H.name} ${f.result.h}–${f.result.a} ${A.name}. ${f.events.filter((e) => e.type === 'yellow').length} caution(s) issued. No further incidents to report. (Illustrative referee report.)`;
  };

  /* ---------- Senior Division: single round-robin, 7 rounds ---------- */
  const senTeams = CLUBS.map((c) => `t-${c.id}-s`);
  const SLOTS = [['v-main', '14:00'], ['v-main', '16:30'], ['v-north', '14:00'], ['v-north', '16:30']];
  const refs = ['o01', 'o02', 'o03', 'o04', 'o05'], ars = ['o06', 'o07', 'o08', 'o09', 'o10'];
  roundRobin(senTeams).forEach((pairs, ri) => {
    const round = ri + 1;
    const date = isoDate(addDays(lastSat, (round - 4) * 7));
    pairs.forEach(([h, a], mi) => {
      const f = makeFixture({ seasonId: 's26', divisionId: 'd-sen', stage: 'league', round, homeId: h, awayId: a, date, time: SLOTS[mi][1], venueId: SLOTS[mi][0] });
      if (round <= 4) {
        appoint(f, [refs[(ri + mi) % 5], ars[(ri + mi) % 5], ars[(ri + mi + 2) % 5], mi === 0 ? (ri % 2 ? 'o12' : 'o11') : null]);
        if (round === 3 && mi === 1) {
          f.status = 'postponed'; f.notes = 'Postponed: pitch unplayable after heavy rain. New date to be confirmed. (Illustrative)';
          return;
        }
        if (round === 4 && mi === 0) {
          play(f, { upTo: 67 });
          f.status = 'abandoned'; f.abandonedAt = 67; f.result = null;
          f.notes = 'Abandoned in the 67th minute: floodlight failure during heavy rain. Decision on replay pending. (Illustrative)';
          f.report = { by: f.officials.ref.id, at: date, text: 'Match abandoned at 67 minutes due to poor light and a waterlogged pitch. Score at abandonment recorded for the competition committee. (Illustrative)' };
          return;
        }
        play(f);
        f.attendance = null;
        f.report = { by: f.officials.ref.id, at: date, text: refReport(f) };
        if (round === 4 && mi === 2) { f.status = 'awaiting'; f.approval = 'submitted'; return; }
        if (round === 4 && mi === 3) { f.status = 'review'; f.approval = 'disputed'; f.notes = 'Result under review following a protest. (Illustrative)'; return; }
        f.status = 'completed'; f.approval = 'approved';
      } else if (round === 5) {
        if (mi < 2) appoint(f, [refs[mi], ars[mi], ars[mi + 2], mi === 0 ? 'o11' : null]);
        if (mi === 2) { appoint(f, [refs[2], ars[4]], 'pending'); }
      }
    });
  });
  // Add a red card to a round 2 match, which creates a suspension case below.
  const redMatch = S.fixtures.find((f) => f.divisionId === 'd-sen' && f.round === 2 && f.status === 'completed');
  const redPlayer = redMatch.lineups.a[6];
  redMatch.events.push({ min: 71, type: 'red', teamId: redMatch.awayId, playerId: redPlayer });
  redMatch.events.sort((a, b) => a.min - b.min);

  /* ---------- Under-17 Cup: two groups then knockout ---------- */
  const u17 = S.divisions.find((d) => d.id === 'd-u17');
  u17.groups.A = ['cre', 'grn', 'riv', 'uni'].map((c) => `t-${c}-y`);
  u17.groups.B = ['sav', 'irn', 'hhk', 'ngw'].map((c) => `t-${c}-y`);
  ['A', 'B'].forEach((g, gi) => {
    roundRobin(u17.groups[g]).forEach((pairs, ri) => {
      const date = isoDate(addDays(lastSat, -13 + ri * 7));
      pairs.forEach(([h, a], mi) => {
        const f = makeFixture({ seasonId: 's26', divisionId: 'd-u17', stage: 'group', group: g, round: ri + 1, homeId: h, awayId: a, date, time: ['10:00', '12:00'][mi], venueId: gi === 0 ? 'v-comm' : 'v-north' });
        appoint(f, [refs[(ri + mi + gi) % 5], ars[(ri + mi + gi + 1) % 5]]);
        if (g === 'B' && ri === 2 && mi === 0) { f.officials.ref = { id: 'o03', status: 'confirmed' }; return; } // played, result not yet submitted
        if (g === 'B' && ri === 2 && mi === 1) { f.status = 'cancelled'; f.notes = 'Cancelled: visiting side unable to travel. To be rearranged under the postponement procedure. (Illustrative)'; return; }
        play(f, { upTo: 70 });
        f.report = { by: f.officials.ref.id, at: date, text: refReport(f) };
        f.status = 'completed'; f.approval = 'approved';
      });
    });
  });
  const ko = (stage, label, days, time) => makeFixture({ seasonId: 's26', divisionId: 'd-u17', stage, label, round: null, homeId: null, awayId: null, date: isoDate(addDays(lastSat, days)), time, venueId: 'v-comm' });
  const sf1 = ko('sf', 'Semi-final 1 · Winner A v Runner-up B', 15, '10:00'); sf1.slotH = 'A1'; sf1.slotA = 'B2';
  const sf2 = ko('sf', 'Semi-final 2 · Winner B v Runner-up A', 15, '12:00'); sf2.slotH = 'B1'; sf2.slotA = 'A2';
  const fin = ko('final', 'Final', 22, '15:00'); fin.slotH = 'W:' + sf1.id; fin.slotA = 'W:' + sf2.id;

  /* ---------- 2025 Invitational (archive example): knockout ---------- */
  const invTeams = ['cre', 'ngw', 'grn', 'hhk', 'uni', 'riv', 'sav', 'irn'].map((c) => `t-${c}-i`);
  const invStart = addDays(t0, -300);
  const qfs = [0, 1, 2, 3].map((i) => {
    const f = makeFixture({ seasonId: 's25', divisionId: 'd-inv', stage: 'qf', label: `Quarter-final ${i + 1}`, homeId: invTeams[i * 2], awayId: invTeams[i * 2 + 1], date: isoDate(addDays(invStart, i < 2 ? 0 : 1)), time: i % 2 ? '16:00' : '14:00', venueId: 'v-main' });
    play(f, { forceWinner: i !== 2 });
    if (i === 2 && f.result.h !== f.result.a) { f.result = { h: 1, a: 1 }; f.events = f.events.filter((e) => e.type !== 'goal'); f.events.push({ min: 34, type: 'goal', teamId: f.homeId, playerId: scorerFrom(f.lineups.h) }, { min: 78, type: 'goal', teamId: f.awayId, playerId: scorerFrom(f.lineups.a) }); f.events.sort((a, b) => a.min - b.min); }
    if (f.result.h === f.result.a) f.result.pens = [4, 3];
    appoint(f, [refs[i % 5], ars[i % 5], ars[(i + 1) % 5]]);
    f.status = 'completed'; f.approval = 'approved';
    return f;
  });
  const winner = (f) => (f.result.h > f.result.a || (f.result.pens && f.result.pens[0] > f.result.pens[1])) ? f.homeId : f.awayId;
  const sfs = [0, 1].map((i) => {
    const f = makeFixture({ seasonId: 's25', divisionId: 'd-inv', stage: 'sf', label: `Semi-final ${i + 1}`, homeId: winner(qfs[i * 2]), awayId: winner(qfs[i * 2 + 1]), date: isoDate(addDays(invStart, 7)), time: i ? '16:00' : '14:00', venueId: 'v-main' });
    play(f, { forceWinner: true }); appoint(f, [refs[(i + 1) % 5], ars[(i + 2) % 5], ars[(i + 3) % 5], 'o11']);
    f.status = 'completed'; f.approval = 'approved';
    return f;
  });
  const invFinal = makeFixture({ seasonId: 's25', divisionId: 'd-inv', stage: 'final', label: 'Final', homeId: winner(sfs[0]), awayId: winner(sfs[1]), date: isoDate(addDays(invStart, 14)), time: '16:00', venueId: 'v-main' });
  play(invFinal, { forceWinner: true }); appoint(invFinal, ['o01', 'o06', 'o07', 'o12']);
  invFinal.status = 'completed'; invFinal.approval = 'approved';
  S.fixtures.filter((f) => f.seasonId === 's25').forEach((f) => { f.report = { by: f.officials.ref.id, at: f.date, text: refReport(f) }; });

  /* ---------- Pending registrations, duplicate warning and transfer ---------- */
  const np = newPlayer('MID', 2001);
  register(np.id, 't-cre-s', 's26', 20, 'pending', { submitted: isoDate(addDays(t0, -2)), note: 'Late registration within the window.' });
  // Same name as an approved player at another club: the admin screen flags it as a possible duplicate.
  const dupSource = S.players.find((p) => S.registrations.some((r) => r.playerId === p.id && r.teamId === 't-irn-s' && r.number === 8));
  const dup = { id: `p${String(++pCount).padStart(3, '0')}`, first: dupSource.first, last: dupSource.last, pos: 'MID', birthYear: dupSource.birthYear, bio: null, photoConsent: false };
  S.players.push(dup);
  register(dup.id, 't-sav-s', 's26', 21, 'pending', { submitted: isoDate(addDays(t0, -1)) });
  const yp = newPlayer('FWD', 2010);
  register(yp.id, 't-riv-y', 's26', 15, 'pending', { submitted: isoDate(addDays(t0, -3)), note: 'Age verification pending (rules awaiting confirmation).' });
  const moving = S.registrations.find((r) => r.teamId === 't-ngw-s' && r.number === 14);
  S.transfers.push({ id: 'tr1', playerId: moving.playerId, fromTeam: 't-ngw-s', toTeam: 't-riv-s', status: 'pending', requested: isoDate(addDays(t0, -4)), note: 'In-season move requested by both clubs. Transfer rules awaiting confirmation.' });

  /* ---------- Team applications ---------- */
  const rep = () => personName().join(' ');
  S.applications = [
    { id: 'app1', name: 'Harmony FC', divisionId: 'd-sen', rep: rep(), status: 'submitted', submitted: isoDate(addDays(t0, -5)), c1: '#0f766e', c2: '#fde68a',
      docs: [{ k: 'Team registration form', ok: true }, { k: 'Squad list', ok: true }, { k: 'Kit colours', ok: true }, { k: 'Safeguarding contact', ok: false }],
      history: [{ at: isoDate(addDays(t0, -5)), by: 'Harmony FC (applicant)', status: 'submitted', note: 'Application submitted for next season.' }] },
    { id: 'app2', name: 'Lakeside Juniors', divisionId: 'd-u17', rep: rep(), status: 'under-review', submitted: isoDate(addDays(t0, -12)), c1: '#1d4ed8', c2: '#e0f2fe',
      docs: [{ k: 'Team registration form', ok: true }, { k: 'Squad list', ok: true }, { k: 'Parental consent forms', ok: true }, { k: 'Safeguarding contact', ok: true }],
      history: [{ at: isoDate(addDays(t0, -12)), by: 'Lakeside Juniors (applicant)', status: 'submitted', note: 'Application submitted.' }, { at: isoDate(addDays(t0, -9)), by: 'Registration officer (demo)', status: 'under-review', note: 'Documents received; reviewing squad eligibility.' }] },
    { id: 'app3', name: 'Old Market FC', divisionId: 'd-sen', rep: rep(), status: 'draft', submitted: null, c1: '#4b5563', c2: '#f97316',
      docs: [{ k: 'Team registration form', ok: true }, { k: 'Squad list', ok: false }, { k: 'Kit colours', ok: false }, { k: 'Safeguarding contact', ok: false }],
      history: [{ at: isoDate(addDays(t0, -2)), by: 'Old Market FC (applicant)', status: 'draft', note: 'Draft started.' }] },
    { id: 'app4', name: 'Bright Future Ladies', divisionId: 'd-wom', rep: rep(), status: 'corrections', submitted: isoDate(addDays(t0, -20)), c1: '#be185d', c2: '#fdf2f8',
      docs: [{ k: 'Team registration form', ok: true }, { k: 'Squad list', ok: false }, { k: 'Kit colours', ok: true }, { k: 'Safeguarding contact', ok: true }],
      history: [{ at: isoDate(addDays(t0, -20)), by: 'Bright Future Ladies (applicant)', status: 'submitted', note: 'Interest in a proposed women\'s division.' }, { at: isoDate(addDays(t0, -15)), by: 'Registration officer (demo)', status: 'corrections', note: 'Squad list incomplete. Women\'s division not yet confirmed by organisers.' }] }
  ];

  /* ---------- Discipline, protests and appeals ---------- */
  const abandoned = S.fixtures.find((f) => f.status === 'abandoned');
  const disputed = S.fixtures.find((f) => f.status === 'review');
  const disputedHomePlayer = disputed.lineups.h[5];
  const r3 = S.fixtures.find((f) => f.divisionId === 'd-sen' && f.round === 3 && f.status === 'completed');
  S.discipline = [
    { id: 'DC-001', type: 'Suspension', category: 'Red card (serious foul play)', date: redMatch.date, matchId: redMatch.id, teamId: redMatch.awayId, playerId: redPlayer, status: 'resolved',
      decision: 'Automatic one-match suspension (illustrative sanction). Served.', public: true,
      history: [{ at: redMatch.date, by: 'Referee report', status: 'submitted', note: 'Sending-off recorded in the match report.' }, { at: isoDate(addDays(new Date(redMatch.date), 2)), by: 'Disciplinary officer (demo)', status: 'resolved', note: 'Standard one-match suspension applied. Player ineligible for the next fixture.' }] },
    { id: 'DC-002', type: 'Appeal', category: 'Appeal against suspension', date: isoDate(addDays(new Date(redMatch.date), 3)), matchId: redMatch.id, teamId: redMatch.awayId, playerId: redPlayer, status: 'rejected',
      decision: 'Appeal rejected. Video evidence unavailable; referee report stands. (Illustrative)', public: true,
      history: [{ at: isoDate(addDays(new Date(redMatch.date), 3)), by: `${teamOf(redMatch.awayId).name} (club)`, status: 'submitted', note: 'Club appeals the dismissal.' }, { at: isoDate(addDays(new Date(redMatch.date), 5)), by: 'Appeals panel (demo)', status: 'rejected', note: 'No new evidence; decision upheld.' }] },
    { id: 'DC-003', type: 'Protest', category: 'Player eligibility protest', date: disputed.date, matchId: disputed.id, teamId: disputed.awayId, playerId: disputedHomePlayer, status: 'under-review',
      decision: '', public: false,
      history: [{ at: disputed.date, by: `${teamOf(disputed.awayId).name} (club)`, status: 'submitted', note: `Protest lodged regarding the registration status of a ${teamOf(disputed.homeId).name} player.` }, { at: isoDate(addDays(new Date(disputed.date), 1)), by: 'Competition secretary (demo)', status: 'under-review', note: 'Registration records requested. Result withheld from the table pending decision.' }] },
    { id: 'DC-004', type: 'Match incident', category: 'Abandoned match', date: abandoned.date, matchId: abandoned.id, teamId: null, playerId: null, status: 'under-review',
      decision: '', public: true,
      history: [{ at: abandoned.date, by: 'Referee report', status: 'submitted', note: 'Match abandoned at 67 minutes.' }, { at: isoDate(addDays(new Date(abandoned.date), 1)), by: 'Competition committee (demo)', status: 'under-review', note: 'Considering replay versus result standing. Rules awaiting confirmation.' }] },
    { id: 'DC-005', type: 'Misconduct', category: 'Technical area conduct', date: r3.date, matchId: r3.id, teamId: r3.homeId, playerId: null, status: 'awaiting-response',
      decision: '', public: false,
      history: [{ at: r3.date, by: 'Match commissioner report', status: 'submitted', note: 'Repeated dissent from the technical area.' }, { at: isoDate(addDays(new Date(r3.date), 2)), by: 'Disciplinary officer (demo)', status: 'awaiting-response', note: 'Club asked to respond within 7 days.' }] }
  ];

  /* ---------- News & announcements ---------- */
  const firstR1 = S.fixtures.find((f) => f.divisionId === 'd-sen' && f.round === 1 && f.status === 'completed');
  const lastCompleted = S.fixtures.filter((f) => f.divisionId === 'd-sen' && f.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))[0];
  const yA = S.fixtures.find((f) => f.divisionId === 'd-u17' && f.status === 'completed');
  S.news = [
    { id: 'n1', cat: 'Competition news', title: 'A new league for Jalingo', dek: 'Why the competition exists, how it is organised and what supporters can expect from the inaugural season.', date: isoDate(addDays(lastSat, -30)), photo: 'night', status: 'published', teamIds: [], matchId: null,
      body: ['This demonstration shows how a properly organised competition could present itself: published fixtures, approved results, transparent tables and a permanent record of every season.', 'The competition name, format, teams and rules shown here are provisional or illustrative. They will be replaced by the organisers\' confirmed information.'] },
    { id: 'n2', cat: 'Match report', title: 'Opening round delivers goals and drama', dek: 'Round 1 of the Senior Division in review.', date: firstR1.date, photo: 'amateur', status: 'published', teamIds: [firstR1.homeId, firstR1.awayId], matchId: firstR1.id,
      body: ['The Senior Division opened with four fixtures across two venues. Every result was confirmed by the competition secretary after the referees\' reports were received.', 'Match reports like this are linked to the fixture, both teams and the players involved, so supporters can move straight from the story to the data.'] },
    { id: 'n3', cat: 'Official notice', title: 'Round 4 fixture abandoned: statement', dek: 'The competition committee is reviewing the abandoned match under the postponement and abandonment procedure.', date: abandoned.date, photo: 'tunnel', status: 'published', teamIds: [abandoned.homeId, abandoned.awayId], matchId: abandoned.id,
      body: ['The match was abandoned in the 67th minute. The score at the time of abandonment does not count towards the table.', 'A decision on whether the match is replayed will be published here. Illustrative notice.'] },
    { id: 'n4', cat: 'Match report', title: `${teamOf(lastCompleted.homeId).name} v ${teamOf(lastCompleted.awayId).name}: the verdict`, dek: 'A confirmed result that shifted the top of the table.', date: lastCompleted.date, photo: 'duel', status: 'published', teamIds: [lastCompleted.homeId, lastCompleted.awayId], matchId: lastCompleted.id,
      body: ['The result was approved after the referee\'s report and team sheets were checked.', 'Illustrative match report.'] },
    { id: 'n5', cat: 'Youth', title: 'Under-17 Cup group stage reaches its final round', dek: 'Group A is settled; Group B awaits one result and a rearranged fixture.', date: isoDate(addDays(lastSat, 1)), photo: 'touch', status: 'published', teamIds: [yA.homeId, yA.awayId], matchId: yA.id,
      body: ['The top two in each group advance to the semi-finals. Knockout pairings are confirmed automatically once group results are approved.', 'Illustrative story.'] },
    { id: 'n6', cat: 'Officials', title: 'Match officials wanted for the new season', dek: 'Referees and assistant referees can register their interest. Qualifications are verified by the organisers.', date: isoDate(addDays(lastSat, -10)), photo: 'line', status: 'published', teamIds: [], matchId: null,
      body: ['Every fixture needs a referee and, where possible, two assistants. Officials can declare their qualifications and availability through the registration form.', 'The competition does not claim to certify officials. Appointment and qualification arrangements will be confirmed by the organisers.'] },
    { id: 'n7', cat: 'Partners', title: 'Partnership opportunities announced', dek: 'Businesses can support the competition across matchdays, media and community football.', date: isoDate(addDays(lastSat, -18)), photo: 'balls', status: 'published', teamIds: [], matchId: null,
      body: ['The partnership programme covers title, principal, official, kit, media and community categories. Sponsor names shown on this site are fictional examples.'] },
    { id: 'n8', cat: 'Player feature', title: 'Leading the scoring charts', dek: 'A closer look at the Senior Division\'s early top scorer.', date: isoDate(addDays(lastSat, -3)), photo: 'kick', status: 'published', teamIds: [], matchId: null, featurePlayer: 'top-scorer',
      body: ['Goals are counted only from approved results. Statistics update automatically when the competition secretary approves a match.', 'Illustrative feature.'] },
    { id: 'n9', cat: 'Community', title: 'Volunteers make matchdays happen', dek: 'Stewards, first-aiders and media volunteers can register their interest.', date: isoDate(addDays(lastSat, -24)), photo: 'pitch', status: 'published', teamIds: [], matchId: null,
      body: ['Volunteer roles are proposed and will be confirmed by the organisers. Illustrative story.'] },
    { id: 'n10', cat: 'Competition news', title: 'Draft: Mid-season review', dek: 'Unpublished draft visible to administrators only.', date: isoDate(t0), photo: 'aerial', status: 'draft', teamIds: [], matchId: null,
      body: ['Draft content.'] }
  ];
  const postponed = S.fixtures.find((f) => f.status === 'postponed');
  S.announcements = [
    { id: 'a1', cat: 'Registration notice', title: 'Player registration window closes soon', body: `Squad registrations for the current season close on ${S.config.regClose}. Late submissions require organiser approval.`, audience: 'Clubs', status: 'published', date: isoDate(addDays(t0, -6)) },
    { id: 'a2', cat: 'Fixture change', title: `${teamOf(postponed.homeId).name} v ${teamOf(postponed.awayId).name} postponed`, body: 'Pitch unplayable. A new date will be published once confirmed.', audience: 'Everyone', status: 'published', date: postponed.date, matchId: postponed.id },
    { id: 'a3', cat: 'Matchday instructions', title: 'Team sheets due 60 minutes before kick-off', body: 'Team representatives must confirm starting line-ups and substitutes before each match. (Illustrative procedure.)', audience: 'Clubs', status: 'published', date: isoDate(addDays(t0, -14)) },
    { id: 'a4', cat: 'Rule update', title: 'Proposed substitution rule', body: 'Draft wording awaiting organiser approval.', audience: 'Clubs', status: 'draft', date: isoDate(t0) },
    { id: 'a5', cat: 'Competition update', title: 'Under-17 semi-final draw', body: 'Semi-final pairings will be confirmed when Group B is complete.', audience: 'Everyone', status: 'scheduled', date: isoDate(addDays(t0, 3)) }
  ];

  /* ---------- Documents ---------- */
  const D = (title, cat, o = {}) => ({ id: `doc${pad2(S.documents.length + 1)}`, title, cat, version: o.v || '0.1', published: o.pub || isoDate(addDays(t0, -40)), effective: o.eff || S.seasons[0].start, review: o.rev || isoDate(addDays(t0, 200)), status: o.status || 'awaiting', visibility: o.vis || 'public', scope: o.scope || 'competition', seasonId: o.season || 's26', url: o.url || null, outline: o.outline || null });
  S.documents = [
    D('Competition rules', 'Rules', { outline: ['Authority and interpretation', 'Competition structure', 'Points and tie-breaking', 'Match arrangements', 'Results and approval', 'Sanctions'] }),
    D('Competition format and structure', 'Rules', { outline: ['Divisions and categories', 'Season structure', 'Group and knockout rules'] }),
    D('Team registration requirements', 'Registration', { outline: ['Who can enter', 'Documents required', 'Representative responsibilities', 'Deadlines'] }),
    D('Player registration and eligibility', 'Registration', { outline: ['Registration process', 'Eligibility criteria (awaiting confirmation)', 'Duplicate registrations', 'Deadlines'] }),
    D('Age-category requirements', 'Registration', { outline: ['Age categories (awaiting confirmation)', 'Proof of age (restricted handling)'] }),
    D('Squad size and player limits', 'Registration', { outline: ['Minimum and maximum squad size (awaiting confirmation)'] }),
    D('Transfer and player movement rules', 'Registration', { outline: ['In-season moves', 'Approval process', 'Cooling-off periods (awaiting confirmation)'] }),
    D('Matchday procedures', 'Matchday', { outline: ['Arrival and kit checks', 'Team sheets', 'Kick-off times', 'Post-match reporting'] }),
    D('Match-official responsibilities', 'Officials', { outline: ['Appointments', 'Pre-match checks', 'Match reports', 'Incident reporting'] }),
    D('Disciplinary procedures', 'Discipline', { outline: ['Cautions and dismissals', 'Suspensions', 'Hearings', 'Publication of decisions'] }),
    D('Yellow-card and red-card procedures', 'Discipline', { outline: ['Accumulation thresholds (awaiting confirmation)', 'Automatic suspensions'] }),
    D('Protests and appeals', 'Discipline', { outline: ['How to lodge a protest', 'Deadlines', 'Appeals panel', 'Fees (if any, awaiting confirmation)'] }),
    D('Postponement and abandonment procedures', 'Matchday', { outline: ['Weather and pitch inspections', 'Abandonment', 'Rearranged fixtures'] }),
    D('Points deductions and administrative rulings', 'Discipline'),
    D('Code of conduct', 'Integrity', { outline: ['Players', 'Officials', 'Coaches', 'Spectators'] }),
    D('Anti-discrimination and fair-play policy', 'Integrity'),
    D('Safeguarding and welfare guidance', 'Integrity', { outline: ['Welfare officer contact', 'Youth participation', 'Reporting concerns'] }),
    D('Medical and emergency procedures', 'Matchday', { outline: ['First aid at venues', 'Emergency action plan', 'Head injuries'] }),
    D('Privacy and data-handling notice', 'Integrity', { outline: ['What is published', 'What stays private', 'Photo and media consent'] }),
    D('Media and photography guidelines', 'Media', { outline: ['Accreditation', 'Youth photography consent', 'Use of competition branding'] }),
    D('Sponsorship and commercial guidelines', 'Commercial'),
    D('Conflict-of-interest declaration form', 'Integrity', { vis: 'restricted' }),
    D('Laws of the Game (IFAB)', 'External', { scope: 'external', status: 'external', v: 'Current edition', url: 'https://www.theifab.com/laws/', outline: null }),
    D('Committee minutes: fixture review', 'Internal', { vis: 'restricted', status: 'draft' }),
    D('Referee appointment schedule (internal)', 'Officials', { vis: 'restricted', status: 'draft' }),
    D('2025 Invitational rules (archive example)', 'Rules', { season: 's25', status: 'archived', pub: isoDate(addDays(t0, -320)), eff: S.seasons[1].start, rev: S.seasons[1].end })
  ];

  /* ---------- Sponsors (fictional examples, clearly labelled) ---------- */
  S.sponsors = [
    { id: 'sp1', name: 'Northline Telecom', tier: 'principal', placements: ['home', 'tables', 'matches'], fictional: true, status: 'active' },
    { id: 'sp2', name: 'Kora Water', tier: 'official', placements: ['matches', 'news'], fictional: true, status: 'active' },
    { id: 'sp3', name: 'Fieldline Sportswear', tier: 'kit', placements: ['home', 'teams'], fictional: true, status: 'active' }
  ];

  /* ---------- Awards ---------- */
  S.awards = [
    { id: 'aw1', seasonId: 's25', title: 'Champions', kind: 'team', ref: 'champion' },
    { id: 'aw2', seasonId: 's25', title: 'Top scorer', kind: 'player', ref: 'top-scorer' },
    { id: 'aw3', seasonId: 's26', title: 'Player of the Month (illustrative)', kind: 'player', ref: 'top-scorer' }
  ];

  /* ---------- Seed audit trail ---------- */
  S.audit = [
    { id: 'au1', at: `${postponed.date}T11:05`, actor: 'Competition secretary (demo)', action: 'Fixture postponed', entity: 'fixture', entityId: postponed.id, before: 'Scheduled', after: 'Postponed', approved: true },
    { id: 'au2', at: `${abandoned.date}T18:40`, actor: 'Competition secretary (demo)', action: 'Match marked abandoned', entity: 'fixture', entityId: abandoned.id, before: 'Scheduled', after: 'Abandoned (67\')', approved: true },
    { id: 'au3', at: `${lastCompleted.date}T20:15`, actor: 'Competition secretary (demo)', action: 'Result approved', entity: 'fixture', entityId: lastCompleted.id, before: 'Submitted', after: `Approved ${lastCompleted.result.h}–${lastCompleted.result.a}`, approved: true },
    { id: 'au4', at: `${isoDate(addDays(new Date(disputed.date), 1))}T09:30`, actor: 'Competition secretary (demo)', action: 'Protest opened', entity: 'discipline', entityId: 'DC-003', before: '', after: 'Under review', approved: null },
    { id: 'au5', at: `${isoDate(addDays(t0, -9))}T14:00`, actor: 'Registration officer (demo)', action: 'Team application reviewed', entity: 'application', entityId: 'app2', before: 'Submitted', after: 'Under review', approved: null }
  ];
  S.audit.sort((a, b) => b.at.localeCompare(a.at));
  return S;
}

/* =========================================================
   STORE: localStorage persistence with safe fallbacks
   ========================================================= */

export { buildSeed, roundRobin, isoDate, addDays, today0, PHOTOS };
