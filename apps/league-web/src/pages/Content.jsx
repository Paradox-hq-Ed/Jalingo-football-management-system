import { useEffect, useRef, useState } from 'react';
import { Async, Button, Checkbox, EmptyState, FormError, FormGrid, Input, Link, Modal, Pill, Select, Skeleton, Textarea, fmtDate, useDocumentTitle, useForm, useQuery, useQueryParams } from '@jalingo/shared';
import { api } from '../api.js';
import { useLeague } from '../data.jsx';
import { PageHead } from '../components/ui.jsx';

export function News() {
  useDocumentTitle('News · JFL');
  const query = useQuery(api, '/league/news');
  const [q, setQ] = useQueryParams();
  const cat = q.get('cat') || 'All';
  return (
    <>
      <PageHead title="News" lede="Competition updates, match reports and announcements." />
      <section className="section section--tight"><div className="wrap"><Async query={query} skeleton={<Skeleton lines={6} />}>{(items) => {
        const cats = ['All', ...new Set(items.map((n) => n.cat))], list = items.filter((n) => cat === 'All' || n.cat === cat);
        return <><div className="toolbar" role="group" aria-label="Category">{cats.map((c) => <button key={c} type="button" className="pill-tab" aria-pressed={cat === c} onClick={() => setQ({ cat: c === 'All' ? null : c })}>{c}</button>)}</div>
          <div className="card-grid">{list.map((n) => <Link key={n.id} to={`/news/${n.id}`} className="card news-card"><div className="news-meta"><span className="cat">{n.cat}</span><span>{fmtDate(n.date, 'medium')}</span></div><h3>{n.title}</h3><p className="muted" style={{ margin: 0 }}>{n.dek}</p></Link>)}</div></>;
      }}</Async></div></section>
    </>
  );
}
export function Article({ id }) {
  const query = useQuery(api, `/league/news/${id}`);
  useDocumentTitle(query.data ? `${query.data.title} · JFL` : 'News · JFL');
  return <Async query={query}>{(n) => <><PageHead crumbs={[['/news', 'News'], [null, n.cat]]} title={n.title} lede={n.dek} /><section className="section"><div className="wrap wrap--narrow" style={{ padding: 0 }}><p className="muted">{fmtDate(n.date, 'medium')}</p>{n.body.map((p, i) => <p key={i} style={{ fontSize: '1.1rem', lineHeight: 1.75 }}>{p}</p>)}</div></section></>}</Async>;
}

export function Competition() {
  useDocumentTitle('Competition · JFL');
  const { config, season, seasons, activeDivisions, venues, sponsors, awards } = useLeague();
  const docs = useQuery(api, '/league/documents');
  const TB = { gd: 'Goal difference', gf: 'Goals scored', wins: 'Number of wins', h2h: 'Head-to-head points' };
  const FORMAT = { 'single-rr': 'Single round-robin', 'double-rr': 'Double round-robin', 'groups-ko': 'Groups then knockout', knockout: 'Knockout' };
  const [doc, setDoc] = useState(null);
  const tiers = ['principal', 'official', 'community'];
  return (
    <>
      <PageHead title="The competition" lede={`${config.compName} · ${season.name} (${fmtDate(season.start, 'medium')} to ${fmtDate(season.end, 'medium')})`} />
      <section className="section section--tight"><div className="wrap stack" style={{ '--gap': '48px' }}>
        <div className="grid grid--2" style={{ alignItems: 'start' }}>
          <div><h2 style={{ marginBottom: 14 }}>Divisions</h2><div className="stack" style={{ '--gap': '10px' }}>{activeDivisions.map((d) => <div key={d.id} className="card"><div className="row row--between"><h3>{d.name}</h3><Pill tone="info">{FORMAT[d.format]}</Pill></div><p className="muted small" style={{ margin: 0 }}>{d.category} · {d.duration}-minute matches</p></div>)}</div></div>
          <div><h2 style={{ marginBottom: 14 }}>Points &amp; tie-breaks</h2><dl className="kv"><dt>Win</dt><dd>{config.points.w} points</dd><dt>Draw</dt><dd>{config.points.d} point</dd><dt>Loss</dt><dd>{config.points.l} points</dd>{config.tiebreak.map((k, i) => <><dt key={`${k}t`}>Tie-break {i + 1}</dt><dd key={k}>{TB[k]}</dd></>)}<dt>Minimum rest</dt><dd>{config.minRestDays} days between matches</dd></dl></div>
        </div>
        <div id="venues"><h2 style={{ marginBottom: 14 }}>Venues</h2><div className="card-grid">{venues.map((v) => <div key={v.id} className="card"><h3>{v.name}</h3><p className="muted small" style={{ margin: 0 }}>{v.area} · {v.surface}</p><div className="row">{v.facilities.map((f) => <Pill key={f.k} tone={f.s === 'yes' ? 'ok' : 'neutral'}>{f.k}{f.s === 'tbc' ? ' (TBC)' : ''}</Pill>)}</div></div>)}</div></div>
        <div id="documents"><h2 style={{ marginBottom: 14 }}>Documents</h2><Async query={docs} skeleton={<Skeleton lines={4} />} empty={<EmptyState title="No documents published yet" />}>{(list) => <div className="card-grid">{list.map((d) => <button key={d.id} type="button" className="card" style={{ textAlign: 'left' }} onClick={() => setDoc(d)}><div className="row row--between"><h3>{d.title}</h3><Pill tone={d.status === 'published' ? 'ok' : 'warn'}>{d.status === 'published' ? `v${d.version}` : 'Awaiting'}</Pill></div><p className="muted small" style={{ margin: 0 }}>{d.cat} · effective {fmtDate(d.effective, 'medium')}</p></button>)}</div>}</Async></div>
        <div id="partners"><h2 style={{ marginBottom: 14 }}>Partners</h2><div className="stack">{tiers.map((t) => { const l = sponsors.filter((s) => s.tier === t); return l.length > 0 && <div key={t}><p className="eyebrow">{t === 'principal' ? 'Principal partner' : t === 'official' ? 'Official partners' : 'Community supporters'}</p><div className="sponsor-strip">{l.map((s) => <span key={s.id} className="sponsor">{s.name}</span>)}</div></div>; })}<p className="muted small">Partner names are illustrative placeholders. <Link to="/contact?kind=sponsor" className="text-link">Become a partner →</Link></p></div></div>
        <div id="archive"><h2 style={{ marginBottom: 14 }}>Seasons &amp; archive</h2><dl className="kv">{seasons.map((s) => <><dt key={`${s.id}t`}>{s.name}</dt><dd key={s.id}>{s.label} <Pill tone={s.status === 'active' ? 'ok' : 'neutral'}>{s.status}</Pill>{awards.filter((a) => a.seasonId === s.id).map((a) => <span key={a.id} className="muted small"> · {a.title}</span>)}</dd></>)}</dl></div>
      </div></section>
      <Modal open={!!doc} onClose={() => setDoc(null)} title={doc?.title || ''} eyebrow={doc && `${doc.cat} · version ${doc.version}`}>{doc && <><p className="muted">Effective {fmtDate(doc.effective, 'medium')} · review {fmtDate(doc.review, 'medium')}</p><h3 style={{ margin: '12px 0 6px' }}>Contents</h3><ol>{doc.outline.map((o) => <li key={o}>{o}</li>)}</ol>{doc.status !== 'published' && <p className="notice notice--warn">This document is awaiting organiser confirmation.</p>}</>}</Modal>
    </>
  );
}

export function Contact() {
  useDocumentTitle('Contact · JFL');
  const [q] = useQueryParams();
  const [done, setDone] = useState(false);
  const ref = useRef(null);
  const f = useForm({ kind: q.get('kind') || 'contact', name: '', email: '', org: '', message: '' }, async (v) => { await api('/league/enquiries', { method: 'POST', body: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '')) }); setDone(true); });
  useEffect(() => { if (done) ref.current?.focus(); }, [done]);
  const e = f.errors;
  return (
    <>
      <PageHead title="Contact" lede="Clubs, officials, media and partners: tell us what you need." />
      <section className="section"><div className="wrap wrap--narrow" style={{ padding: 0 }}>
        {done ? <div className="panel panel__body" ref={ref} tabIndex={-1} role="status"><h2>Thank you</h2><p className="muted">The competition office will reply by email.</p><Button variant="ghost" onClick={() => { setDone(false); f.reset(); }}>Send another</Button></div> : (
          <form className="panel panel__body" onSubmit={f.submit} noValidate>
            <FormGrid>
              <Select label="I’m contacting you about" full options={[{ value: 'contact', label: 'General enquiry' }, { value: 'team', label: 'Registering a team' }, { value: 'official', label: 'Becoming a match official' }, { value: 'media', label: 'Media' }, { value: 'sponsor', label: 'Partnership' }]} {...f.bind('kind')} error={e.kind} />
              <Input label="Name" autoComplete="name" required {...f.bind('name')} error={e.name} /><Input label="Email" type="email" autoComplete="email" required {...f.bind('email')} error={e.email} />
              <Input label="Club or organisation" full optional {...f.bind('org')} error={e.org} /><Textarea label="Message" required {...f.bind('message')} error={e.message} />
            </FormGrid>
            <FormError error={f.formError && !Object.keys(e).length ? f.formError : null} /><Button type="submit" loading={f.submitting}>Send message</Button>
          </form>)}
      </div></section>
    </>
  );
}
