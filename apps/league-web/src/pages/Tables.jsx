import { Async, Link, Skeleton, Tabs, useDocumentTitle, useQuery, useQueryParams } from '@jalingo/shared';
import { api } from '../api.js';
import { useLeague } from '../data.jsx';
import { PageHead, StandingsTable, FixtureList } from '../components/ui.jsx';

export default function Tables() {
  useDocumentTitle('Tables · JFL');
  const { activeDivisions, config, season } = useLeague();
  const [q, setQ] = useQueryParams();
  const id = q.get('division') || activeDivisions[0]?.id;
  const div = activeDivisions.find((d) => d.id === id) || activeDivisions[0];
  const t = useQuery(api, div && `/league/tables/${div.id}`);
  const ko = useQuery(api, div?.format === 'groups-ko' && '/league/fixtures', { seasonId: season.id, divisionId: div?.id });
  return (
    <>
      <PageHead title="League tables" lede={`${config.points.w} points for a win, ${config.points.d} for a draw. Ties are broken by ${config.tiebreak.map((k) => ({ gd: 'goal difference', gf: 'goals scored', wins: 'wins', h2h: 'head-to-head' }[k])).join(', then ')}. Only approved results count.`} />
      <section className="section section--tight"><div className="wrap">
        <Tabs value={div?.id} onChange={(v) => setQ({ division: v })} label="Division" tabs={activeDivisions.map((d) => ({ key: d.id, label: d.short }))} />
        <Async query={t} skeleton={<Skeleton lines={8} height={32} />}>{(data) => data.groups
          ? <div className="stack" style={{ '--gap': '32px' }}>{Object.entries(data.groups).map(([g, rows]) => <div key={g}><h2 style={{ marginBottom: 14 }}>Group {g}</h2><StandingsTable rows={rows} /><p className="muted small" style={{ marginTop: 8 }}>Top {div.advance} advance to the knockout stage.</p></div>)}
              <div><h2 style={{ marginBottom: 14 }}>Knockout stage</h2><Async query={ko} skeleton={<Skeleton lines={3} />}>{(l) => <FixtureList fixtures={l.filter((f) => f.stage !== 'group')} grouped={false} showDivision={false} />}</Async></div></div>
          : <StandingsTable rows={data.table} />}</Async>
      </div></section>
    </>
  );
}
