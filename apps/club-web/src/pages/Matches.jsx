import { EmptyState, Link, Skeleton, Async, Select, useDocumentTitle, useQuery, useQueryParams } from '@jalingo/shared';
import { api } from '../api.js';
import { useClub } from '../data.jsx';
import { MatchRow, PageHero, SampleTag } from '../components/common.jsx';

export default function Matches({ filter = 'all' }) {
  useDocumentTitle('Matches · Eland FC');
  const { league, club } = useClub();
  const [q, setQ] = useQueryParams();
  const venue = q.get('venue') || 'any';
  const matches = useQuery(api, '/club/matches');
  const f = ['all', 'upcoming', 'results'].includes(filter) ? filter : 'all';
  const open = (id) => setQ({ match: id }, { replace: false });

  return (
    <>
      <PageHero eyebrow="Match centre" title="Fixtures & results." lede="Kick-off times, venues, scores and how the season is shaping up." />
      <section className="section on-light" aria-label="Match list"><div className="wrap">
        <div className="filters" style={{ alignItems: 'center' }}>
          <div className="chips" style={{ margin: 0 }} role="group" aria-label="Show">{[['all', 'All matches'], ['upcoming', 'Upcoming'], ['results', 'Results']].map(([k, l]) => <Link key={k} to={`/matches/${k}`} className="chip" aria-current={f === k ? 'page' : undefined} replace scroll={false}>{l}</Link>)}</div>
          <Select label="Venue" value={venue} onChange={(e) => setQ({ venue: e.target.value === 'any' ? null : e.target.value })} options={[{ value: 'any', label: 'Home & away' }, { value: 'home', label: 'Home' }, { value: 'away', label: 'Away' }]} />
          <SampleTag>Sample data</SampleTag>
        </div>
        <Async query={matches} skeleton={<Skeleton lines={8} height={56} />}>{(all) => {
          const list = all.filter((m) => (f === 'all' || (f === 'upcoming') === (m.status === 'upcoming')) && (venue === 'any' || (venue === 'home') === m.home));
          const sorted = f === 'results' ? [...list].reverse() : f === 'upcoming' ? list : [...list].reverse();
          return sorted.length ? <ul className="match-list">{sorted.map((m) => <MatchRow key={m.id} m={m} onOpen={open} />)}</ul> : <EmptyState title="No matches match these filters" action={<Link className="btn btn--ghost" to="/matches/all">Show all matches</Link>} />;
        }}</Async>
      </div></section>
      <section className="section on-paper" aria-labelledby="table-title"><div className="wrap">
        <div className="section-head"><div><p className="eyebrow">Standings</p><h2 id="table-title">{league.name}</h2></div><SampleTag>Sample table</SampleTag></div>
        <div className="table-wrap"><table className="table league-table"><caption className="sr-only">{league.name}</caption>
          <thead><tr><th>#</th><th>Team</th>{['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].map((h) => <th key={h} className="num">{h}</th>)}</tr></thead>
          <tbody>{[...league.rows].map((r) => ({ ...r, gd: r.gf - r.ga, pts: r.w * 3 + r.d })).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf).map((r, i) => (
            <tr key={r.team} className={r.team === club.name ? 'is-eland-row' : undefined}><td>{i + 1}</td><td>{r.team}</td>{[r.p, r.w, r.d, r.l, r.gf, r.ga, r.gd, r.pts].map((v, j) => <td key={j} className="num">{v}</td>)}</tr>))}</tbody></table></div>
      </div></section>
    </>
  );
}
