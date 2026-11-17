import { Async, DataTable, Link, Select, Skeleton, Tabs, TabPanel, useDocumentTitle, useQuery, useQueryParams } from '@jalingo/shared';
import { api } from '../api.js';
import { useLeague } from '../data.jsx';
import { Crest, PageHead } from '../components/ui.jsx';

export default function Stats() {
  useDocumentTitle('Statistics · JFL');
  const { season, activeDivisions, team, club } = useLeague();
  const [q, setQ] = useQueryParams();
  const division = q.get('division') || activeDivisions[0]?.id, tab = q.get('tab') || 'scorers';
  const players = useQuery(api, '/league/stats/players', { seasonId: season.id, divisionId: division });
  const teams = useQuery(api, '/league/stats/teams', { divisionId: division });
  const TeamCell = ({ id }) => <Link to={`/teams/${id}`} className="team"><Crest club={club(id)} size={22} /><span className="n">{team(id)?.name}</span></Link>;
  const nameCell = (r) => <Link to={`/players/${r.playerId}`}>{r.name}</Link>;
  return (
    <>
      <PageHead title="Statistics" lede="Goals, discipline and team records from approved matches." />
      <section className="section section--tight"><div className="wrap">
        <div className="filters"><Select label="Division" value={division} onChange={(e) => setQ({ division: e.target.value })} options={activeDivisions.map((d) => ({ value: d.id, label: d.name }))} /></div>
        <Tabs value={tab} onChange={(t) => setQ({ tab: t })} label="Statistics" tabs={[{ key: 'scorers', label: 'Top scorers' }, { key: 'discipline', label: 'Discipline' }, { key: 'keepers', label: 'Clean sheets' }, { key: 'teams', label: 'Teams' }]} />
        <Async query={players} skeleton={<Skeleton lines={8} height={30} />}>{(rows) => {
          const col = (f) => rows.filter(f);
          return (<>
            <TabPanel id="scorers" active={tab === 'scorers'}><DataTable caption="Top scorers" initialSort={{ key: 'goals', dir: 'desc' }} rows={col((r) => r.goals > 0).slice().sort((a, b) => b.goals - a.goals).slice(0, 25)} columns={[{ key: 'name', header: 'Player', render: nameCell }, { key: 'teamId', header: 'Team', render: (r) => <TeamCell id={r.teamId} />, sortValue: (r) => team(r.teamId)?.name }, { key: 'apps', header: 'Apps', numeric: true }, { key: 'goals', header: 'Goals', numeric: true }]} empty="No goals recorded yet." /></TabPanel>
            <TabPanel id="discipline" active={tab === 'discipline'}><DataTable caption="Discipline" initialSort={{ key: 'pts', dir: 'desc' }} rows={col((r) => r.yellow + r.red > 0).map((r) => ({ ...r, pts: r.yellow + r.red * 3 }))} columns={[{ key: 'name', header: 'Player', render: nameCell }, { key: 'teamId', header: 'Team', render: (r) => <TeamCell id={r.teamId} />, sortValue: (r) => team(r.teamId)?.name }, { key: 'yellow', header: 'Yellow', numeric: true }, { key: 'red', header: 'Red', numeric: true }]} empty="No cards recorded yet." /></TabPanel>
            <TabPanel id="keepers" active={tab === 'keepers'}><DataTable caption="Clean sheets" initialSort={{ key: 'cs', dir: 'desc' }} rows={col((r) => r.pos === 'GK' && r.cs > 0)} columns={[{ key: 'name', header: 'Goalkeeper', render: nameCell }, { key: 'teamId', header: 'Team', render: (r) => <TeamCell id={r.teamId} />, sortValue: (r) => team(r.teamId)?.name }, { key: 'apps', header: 'Apps', numeric: true }, { key: 'cs', header: 'Clean sheets', numeric: true }]} empty="No clean sheets yet." /></TabPanel>
          </>);
        }}</Async>
        <TabPanel id="teams" active={tab === 'teams'}><Async query={teams} skeleton={<Skeleton lines={6} />}>{(rows) => <DataTable caption="Team statistics" initialSort={{ key: 'gf', dir: 'desc' }} rows={rows} columns={[{ key: 'id', header: 'Team', render: (r) => <TeamCell id={r.id} />, sortValue: (r) => team(r.id)?.name }, { key: 'played', header: 'P', numeric: true }, { key: 'gf', header: 'GF', numeric: true }, { key: 'ga', header: 'GA', numeric: true }, { key: 'gpg', header: 'Goals/game', numeric: true, render: (r) => r.gpg.toFixed(2) }, { key: 'cs', header: 'Clean sheets', numeric: true }, { key: 'y', header: 'Yellow', numeric: true }, { key: 'r', header: 'Red', numeric: true }]} />}</Async></TabPanel>
      </div></section>
    </>
  );
}
