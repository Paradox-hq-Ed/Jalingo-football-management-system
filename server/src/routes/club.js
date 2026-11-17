import crypto from 'node:crypto';
import { requireRole, rateLimit } from '../auth.js';
import { HttpError, notFound, validate, badRequest } from '../http.js';

const uid = (p) => `${p}-${crypto.randomBytes(5).toString('hex')}`;
const today = () => new Date().toISOString().slice(0, 10);

/* Months between the first of this month and an ISO date: the demo's "end <= 6" rule means "expiring". */
const monthsFromNow = (iso) => { const d = new Date(iso), n = new Date(); return (d.getFullYear() - n.getFullYear()) * 12 + d.getMonth() - n.getMonth(); };
export function contractStatus(c) {
  if (c.type === 'trial') return { key: 'trial', label: 'On trial' };
  if (c.type === 'loan') return { key: 'loan', label: 'On loan' };
  if (monthsFromNow(c.endDate) <= 6) return { key: 'expiring', label: 'Expiring' };
  return { key: 'active', label: 'Active' };
}
const withStatus = (p) => ({ ...p, contract: { ...p.contract, status: contractStatus(p.contract) } });

export function mountClub(app, stores) {
  const C = stores.club;
  const admin = requireRole('club_admin');
  const published = (ctx, repo) => repo.all(ctx.user?.role === 'club_admin' ? {} : { status: 'published' });

  app.get('/api/club/profile', () => ({ ...stores.docs.get('efc.profile'), serverDate: today() }));
  app.get('/api/club/squads', () => C.squads.all());
  app.get('/api/club/matches', () => C.matches.all({}, { orderBy: 'date' }));
  app.get('/api/club/matches/:id', (ctx) => C.matches.get(ctx.params.id) || (() => { throw notFound('Match not found'); })());
  app.get('/api/club/players', (ctx) => C.players.all(ctx.query.squad ? { squad: ctx.query.squad } : {}).map(withStatus));
  app.get('/api/club/players/:id', (ctx) => { const p = C.players.get(ctx.params.id); if (!p) throw notFound('Player not found'); return withStatus(p); });
  app.get('/api/club/former', () => C.former.all());
  app.get('/api/club/people', () => C.people.all().sort((a, b) => a.sort - b.sort));
  app.get('/api/club/news', (ctx) => published(ctx, C.news).sort((a, b) => b.date.localeCompare(a.date)));
  app.get('/api/club/news/:id', (ctx) => { const n = C.news.get(ctx.params.id); if (!n || (n.status !== 'published' && ctx.user?.role !== 'club_admin')) throw notFound('Story not found'); return n; });
  app.get('/api/club/gallery', () => C.gallery.all().sort((a, b) => a.sort - b.sort));

  /* Public enquiry form: general / trials / sponsorship / media. Fields mirror the demo's form. */
  const base = { name: { type: 'string', minLen: 2, maxLen: 120 }, email: 'email', phone: { type: 'string', optional: true, maxLen: 40 }, message: { type: 'string', minLen: 10, maxLen: 1500 }, consent: 'boolean' };
  const extra = {
    general: {},
    trials: { age: { type: 'number', min: 12, max: 45 }, position: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'], experience: { type: 'string', optional: true, maxLen: 160 } },
    sponsorship: { organisation: { type: 'string', minLen: 2, maxLen: 160 }, interest: { type: 'string', maxLen: 80 } },
    media: { outlet: { type: 'string', minLen: 2, maxLen: 160 }, deadline: { type: 'date', optional: true } }
  };
  app.post('/api/club/enquiries', (ctx) => {
    if (!rateLimit(`efc-enq:${ctx.req.socket.remoteAddress}`, 8, 60 * 60 * 1000)) throw new HttpError(429, 'Too many messages. Please try again later.');
    const type = ctx.body?.type;
    if (!extra[type]) throw badRequest('Choose an enquiry type.', { type: 'Must be one of: general, trials, sponsorship, media.' });
    const d = validate(ctx.body, { ...base, ...extra[type] });
    if (!d.consent) throw badRequest('Please confirm you are happy for the club to use your details.', { consent: 'Please tick to continue.' });
    if (ctx.body.website) return { ok: true }; // honeypot: silently drop bots
    const { consent, ...fields } = d;
    const rec = { id: uid('enq'), type, ...fields, at: new Date().toISOString(), status: 'new' };
    C.enquiries.insert(rec);
    return { ok: true, id: rec.id };
  });

  /* ---- club administration ---- */
  app.get('/api/club/admin/enquiries', admin, (ctx) => C.enquiries.all(ctx.query.type ? { type: ctx.query.type } : {}).sort((a, b) => b.at.localeCompare(a.at)));
  app.patch('/api/club/admin/enquiries/:id', admin, (ctx) => {
    if (!C.enquiries.get(ctx.params.id)) throw notFound('Enquiry not found');
    const d = validate(ctx.body, { status: ['new', 'read', 'replied', 'archived'] });
    return C.enquiries.update(ctx.params.id, d);
  });

  const matchSchema = { date: 'date', time: 'time', home: 'boolean', opponent: { type: 'string', minLen: 2, maxLen: 80 }, competition: { type: 'string', maxLen: 80 }, venue: { type: 'string', maxLen: 120 }, postponed: { type: 'boolean', optional: true }, score: { type: 'any', optional: true }, potm: { type: 'number', optional: true, min: 1, max: 99 }, events: { type: 'any', optional: true } };
  const finish = (rec) => {
    const hasScore = Array.isArray(rec.score) && rec.score.length === 2;
    const status = rec.postponed ? 'postponed' : hasScore ? (rec.score[0] > rec.score[1] ? 'win' : rec.score[0] < rec.score[1] ? 'loss' : 'draw') : 'upcoming';
    return { ...rec, status, kind: status === 'upcoming' ? 'fixture' : 'result' };
  };
  app.post('/api/club/admin/matches', admin, (ctx) => C.matches.insert(finish({ id: uid('m'), ...validate(ctx.body, matchSchema) })));
  app.patch('/api/club/admin/matches/:id', admin, (ctx) => {
    const cur = C.matches.get(ctx.params.id);
    if (!cur) throw notFound('Match not found');
    const patch = validate(ctx.body, Object.fromEntries(Object.entries(matchSchema).map(([k, v]) => [k, typeof v === 'string' ? `${v}?` : { ...v, optional: true }])));
    return C.matches.save(finish({ ...cur, ...patch }));
  });
  app.delete('/api/club/admin/matches/:id', admin, (ctx) => { if (!C.matches.delete(ctx.params.id)) throw notFound('Match not found'); return { ok: true }; });

  app.patch('/api/club/admin/players/:id', admin, (ctx) => {
    if (!C.players.get(ctx.params.id)) throw notFound('Player not found');
    const d = validate(ctx.body, { name: { type: 'string', optional: true, maxLen: 120 }, availability: { type: 'enum', values: ['available', 'injured', 'suspended'], optional: true }, verified: { type: 'boolean', optional: true } });
    return withStatus(C.players.update(ctx.params.id, d));
  });

  const storySchema = { cat: ['Matches', 'Club', 'Community', 'Squad', 'Video'], title: { type: 'string', minLen: 3, maxLen: 160 }, dek: { type: 'string', maxLen: 300 }, body: 'any', photo: { type: 'string', optional: true }, featured: { type: 'boolean', optional: true }, status: ['draft', 'published'] };
  app.post('/api/club/admin/news', admin, (ctx) => { const d = validate(ctx.body, storySchema); return C.news.insert({ id: uid('n'), photo: 'ball', featured: false, ...d, body: [].concat(d.body || []), date: today() }); });
  app.patch('/api/club/admin/news/:id', admin, (ctx) => {
    if (!C.news.get(ctx.params.id)) throw notFound('Story not found');
    const patch = validate(ctx.body, Object.fromEntries(Object.entries(storySchema).map(([k, v]) => [k, typeof v === 'string' ? `${v}?` : Array.isArray(v) ? { type: 'enum', values: v, optional: true } : { ...v, optional: true }])));
    if (patch.body) patch.body = [].concat(patch.body);
    return C.news.update(ctx.params.id, patch);
  });
  app.delete('/api/club/admin/news/:id', admin, (ctx) => { if (!C.news.delete(ctx.params.id)) throw notFound('Story not found'); return { ok: true }; });
}
