import { Async, Button, EmptyState, Link, Pill, Select, Skeleton, Tabs, TabPanel, fmtDate, fmt, toDate, useDocumentTitle, useQuery, useQueryParams } from '@jalingo/shared';
import { api } from '../api.js';
import { useLeague } from '../data.jsx';
import { FixtureList, PageHead, StatusPill, TeamName, Score, slotText, STATUS } from '../components/ui.jsx';

export default function Matches() {
  useDocumentTitle('Fixtures & results · JFL');
  const { season, activeDivisions, activeTeams } = useLeague();
  const [q, setQ] = useQueryParams();
  const when = q.get('when') || 'all', division = q.get('division') || '', team = q.get('team') || '', status = q.get('status') || '';
  const query = useQuery(api, '/league/fixtures', { seasonId: season.id, divisionId: division, teamId: team, status, when: when === 'all' ? undefined : when, order: when === 'results' ? 'desc' : undefined });
  const teams = activeTeams.filter((t) => !division || t.divisionId === division).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHead title="Fixtures & results" lede={`${season.name} · every match across all divisions.`} />
      <section className="section section--tight"><div className="wrap">
        <div className="toolbar" role="group" aria-label="Show">{[['all', 'All'], ['upcoming', 'Upcoming'], ['results', 'Results']].map(([k, l]) => <button key={k} type="button" className="pill-tab" aria-pressed={when === k} onClick={() => setQ({ when: k === 'all' ? null : k })}>{l}</button>)}</div>
        <div className="filters">
          <Select label="Division" value={division} onChange={(e) => setQ({ division: e.target.value, team: null })} placeholder="All divisions" options={activeDivisions.map((d) => ({ value: d.id, label: d.name }))} />
          <Select label="Team" value={team} onChange={(e) => setQ({ team: e.target.value })} placeholder="All teams" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
          <Select label="Status" value={status} onChange={(e) => setQ({ status: e.target.value })} placeholder="Any status" options={Object.entries(STATUS).map(([v, [label]]) => ({ value: v, label }))} />
          {(division || team || status) && <Button variant="ghost" onClick={() => setQ({ division: null, team: null, status: null })}>Clear filters</Button>}
        </div>
        <Async query={query} skeleton={<Skeleton lines={8} height={56} />} empty={<EmptyState title="No matches found">Try clearing a filter.</EmptyState>}>{(list) => <><p className="muted small" aria-live="polite">{list.length} matches</p><FixtureList fixtures={list} /></>}</Async>
      </div></section>
    </>
  );
}

const initials = (p) => `${p.first[0]}${p.last[0]}`;
export function MatchDetail({ id }) {
  const { division, venue, team } = useLeague();
  const query = useQuery(api, `/league/fixtures/${id}`);
  const officials = useQuery(api, '/league/officials');
  const f = query.data?.fixture;
  const homeSquad = useQuery(api, f?.resolved.homeId && `/league/teams/${f.resolved.homeId}`);
  const awaySquad = useQuery(api, f?.resolved.awayId && `/league/teams/${f.resolved.awayId}`);
  useDocumentTitle(f ? `${team(f.resolved.homeId)?.name || 'TBC'} v ${team(f.resolved.awayId)?.name || 'TBC'} · JFL` : 'Match · JFL');
  const [q, setQ] = useQueryParams();
  const tab = q.get('tab') || 'summary';
  const players = Object.fromEntries([...(homeSquad.data?.squad || []), ...(awaySquad.data?.squad || [])].map((p) => [p.id, p]));
  const pname = (pid) => (players[pid] ? `${players[pid].first} ${players[pid].last}` : 'Player');
  const offName = (o) => { const x = officials.data?.find((y) => y.id === o?.id); return x ? `${x.first} ${x.last}` : '—'; };
  const ROLE = { ref: 'Referee', ar1: 'Assistant referee 1', ar2: 'Assistant referee 2', comm: 'Match commissioner' };

  return (
    <Async query={query}>{({ fixture: f, cases }) => (
      <>
        <PageHead crumbs={[['/matches', 'Fixtures'], [null, `${division(f.divisionId)?.name}`]]} title={`${team(f.resolved.homeId)?.name || slotText(f.slotH)} v ${team(f.resolved.awayId)?.name || slotText(f.slotA)}`} lede={`${fmt.long.format(toDate(f.date, f.time))} · ${f.time} · ${venue(f.venueId)?.name}`}><StatusPill status={f.status} /></PageHead>
        <section className="section section--tight"><div className="wrap">
          <div className="card" style={{ justifyItems: 'center', padding: 28, marginBottom: 24 }}>
            <div className="row" style={{ justifyContent: 'center', gap: 28 }}><TeamName id={f.resolved.homeId} slot={slotText(f.slotH)} size={52} /><span style={{ transform: 'scale(1.5)' }}><Score f={f} /></span><TeamName id={f.resolved.awayId} slot={slotText(f.slotA)} size={52} side="away" /></div>
            {f.status === 'awaiting' && <p className="notice notice--warn" style={{ margin: 0 }}>This result is provisional until it has been approved by the competition secretary.</p>}
            {f.notes && <p className="muted" style={{ margin: 0 }}>{f.notes}</p>}
          </div>
          <Tabs value={tab} onChange={(t) => setQ({ tab: t })} label="Match centre" tabs={[{ key: 'summary', label: 'Summary' }, { key: 'lineups', label: 'Line-ups' }, { key: 'officials', label: 'Officials' }, ...(cases.length ? [{ key: 'cases', label: 'Incidents', badge: cases.length }] : [])]} />
          <TabPanel id="summary" active={tab === 'summary'}>
            <div className="grid grid--2">
              <dl className="kv"><dt>Division</dt><dd>{division(f.divisionId)?.name}</dd><dt>Round</dt><dd>{f.label || (f.round ? `Round ${f.round}` : '—')}</dd><dt>Date</dt><dd>{fmtDate(f.date, 'long')}</dd><dt>Kick-off</dt><dd>{f.time}</dd><dt>Venue</dt><dd>{venue(f.venueId)?.name}</dd>{f.attendance != null && <><dt>Attendance</dt><dd>{f.attendance}</dd></>}</dl>
              <div>{f.events.length ? <ul className="timeline">{f.events.map((e, i) => <li key={i}><b>{e.min}′</b>{e.type === 'goal' ? <span aria-label="Goal">⚽</span> : <span className={`card-ico ${e.type}`} role="img" aria-label={`${e.type} card`} />}<span><strong>{pname(e.playerId)}</strong> <span className="muted">· {team(e.teamId)?.name}</span></span></li>)}</ul> : <p className="muted">No match events recorded.</p>}</div>
            </div>
          </TabPanel>
          <TabPanel id="lineups" active={tab === 'lineups'}>
            {f.lineups ? <div className="grid grid--2">{[['h', f.resolved.homeId], ['a', f.resolved.awayId]].map(([s, tid]) => <div key={s} className="panel"><div className="panel__head"><h3>{team(tid)?.name}</h3></div><div className="panel__body"><ol className="lineup">{f.lineups[s].map((pid) => <li key={pid}><span className="num-badge">{players[pid]?.number ?? ''}</span>{pname(pid)}</li>)}</ol></div></div>)}</div> : <p className="muted">Line-ups are published once a result is submitted.</p>}
          </TabPanel>
          <TabPanel id="officials" active={tab === 'officials'}>
            <dl className="kv">{Object.entries(ROLE).map(([k, l]) => <><dt key={`${k}t`}>{l}</dt><dd key={k}>{f.officials?.[k] ? <Link to={`/officials/${f.officials[k].id}`}>{offName(f.officials[k])}</Link> : <span className="muted">Not yet appointed</span>}</dd></>)}</dl>
          </TabPanel>
          <TabPanel id="cases" active={tab === 'cases'}>{cases.map((c) => <div key={c.id} className="announce" style={{ marginBottom: 10 }}><h3>{c.type}: {c.category}</h3><p className="muted" style={{ margin: 0 }}>{c.decision || 'Under review'} · <Pill tone="info">{c.status}</Pill></p></div>)}</TabPanel>
        </div></section>
      </>
    )}</Async>
  );
}
