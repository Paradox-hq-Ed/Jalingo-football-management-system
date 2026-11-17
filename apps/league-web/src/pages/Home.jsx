import { Async, Link, Skeleton, fmtDate, useDocumentTitle, useQuery } from '@jalingo/shared';
import { api } from '../api.js';
import { useLeague } from '../data.jsx';
import { FixtureList, StandingsTable } from '../components/ui.jsx';

export default function Home() {
  const { config, season, activeDivisions, sponsors } = useLeague();
  useDocumentTitle(`${config.compName} · ${season.name}`);
  const upcoming = useQuery(api, '/league/fixtures', { seasonId: season.id, when: 'upcoming' });
  const results = useQuery(api, '/league/fixtures', { seasonId: season.id, when: 'results', order: 'desc' });
  const lead = activeDivisions.find((d) => d.format !== 'groups-ko') || activeDivisions[0];
  const table = useQuery(api, lead && `/league/tables/${lead.id}`);
  const news = useQuery(api, '/league/news');
  const notices = useQuery(api, '/league/announcements');
  const principal = sponsors.filter((s) => s.tier === 'principal');

  return (
    <>
      <section className="hero stripes"><div className="wrap">
        <p className="hero__tag">{season.name}</p>
        <h1 className="view-heading" tabIndex={-1}>{config.tagline}</h1>
        <p className="lede">Fixtures, results, tables and statistics for every division of the {config.compName}, with clubs, players and match officials all in one place.</p>
        <div className="btn-row" style={{ marginTop: 28 }}><Link className="btn btn--primary" to="/matches">Fixtures &amp; results</Link><Link className="btn btn--ghost" style={{ color: '#fff' }} to="/tables">League tables</Link></div>
      </div></section>

      <section className="section"><div className="wrap grid grid--2" style={{ alignItems: 'start' }}>
        <div><div className="row row--between"><h2>Next up</h2><Link className="text-link" to="/matches?when=upcoming">All fixtures →</Link></div>
          <Async query={upcoming} skeleton={<Skeleton lines={5} height={56} />} empty={<p className="muted">No upcoming fixtures.</p>}>{(l) => <FixtureList fixtures={l.slice(0, 5)} grouped={false} />}</Async></div>
        <div><div className="row row--between"><h2>Latest results</h2><Link className="text-link" to="/matches?when=results">All results →</Link></div>
          <Async query={results} skeleton={<Skeleton lines={5} height={56} />} empty={<p className="muted">No results yet.</p>}>{(l) => <FixtureList fixtures={l.filter((f) => f.status === 'completed').slice(0, 5)} grouped={false} />}</Async></div>
      </div></section>

      {lead && <section className="section on-white"><div className="wrap">
        <div className="row row--between" style={{ marginBottom: 20 }}><h2>{lead.name}</h2><Link className="text-link" to={`/tables?division=${lead.id}`}>Full table →</Link></div>
        <Async query={table} skeleton={<Skeleton lines={6} height={30} />}>{(t) => <StandingsTable rows={(t.table || []).slice(0, 8)} compact />}</Async>
      </div></section>}

      <section className="section"><div className="wrap grid grid--2" style={{ alignItems: 'start', gap: 40 }}>
        <div><h2 style={{ marginBottom: 18 }}>News</h2>
          <Async query={news} skeleton={<Skeleton lines={5} />}>{(items) => <div className="stack">{items.slice(0, 3).map((n) => <Link key={n.id} to={`/news/${n.id}`} className="card news-card"><div className="news-meta"><span className="cat">{n.cat}</span><span>{fmtDate(n.date, 'medium')}</span></div><h3>{n.title}</h3><p className="muted" style={{ margin: 0 }}>{n.dek}</p></Link>)}</div>}</Async></div>
        <div><h2 style={{ marginBottom: 18 }}>Notices</h2>
          <Async query={notices} skeleton={<Skeleton lines={4} />}>{(items) => <div className="stack">{items.slice(0, 4).map((a) => <div key={a.id} className="announce"><div className="news-meta"><span className="cat">{a.cat}</span><span>{fmtDate(a.date, 'medium')}</span></div><h3>{a.title}</h3><p className="muted" style={{ margin: 0 }}>{a.body}</p></div>)}</div>}</Async></div>
      </div></section>

      {principal.length > 0 && <section className="section section--tight on-white"><div className="wrap"><p className="eyebrow">Principal partner</p><div className="sponsor-strip">{principal.map((s) => <span key={s.id} className="sponsor">{s.name}</span>)}<Link className="text-link" to="/competition#partners">All partners →</Link></div></div></section>}
    </>
  );
}
