import { useState } from 'react';
import { Async, DataTable, EmptyState, Input, Link, Pill, Select, Skeleton, Button, fmtDate, useDebounced, useDocumentTitle, useQuery, useQueryParams } from '@jalingo/shared';
import { api } from '../api.js';
import { useLeague } from '../data.jsx';
import { Crest, FixtureList, PageHead, StandingsTable, initials } from '../components/ui.jsx';

const ELIG = { eligible: ['Eligible', 'ok'], suspended: ['Suspended', 'bad'], pending: ['Registration pending', 'warn'], inactive: ['Not registered', 'neutral'] };
const POS = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' };

export function Teams() {
  useDocumentTitle('Teams · JFL');
  const { activeDivisions, activeTeams, club } = useLeague();
  return (
    <>
      <PageHead title="Teams" lede="Every registered team, by division." />
      <section className="section section--tight"><div className="wrap stack" style={{ '--gap': '40px' }}>
        {activeDivisions.map((d) => { const ts = activeTeams.filter((t) => t.divisionId === d.id && ['approved', 'archived', 'withdrawn'].includes(t.regStatus)); return ts.length > 0 && (
          <div key={d.id}><h2 style={{ marginBottom: 16 }}>{d.name}</h2>
            <div className="card-grid">{ts.map((t) => <Link key={t.id} to={`/teams/${t.id}`} className="card"><div className="team"><Crest club={club(t.id)} size={44} /><span className="n" style={{ fontSize: '1.15rem' }}>{t.name}</span></div>{t.regStatus === 'withdrawn' && <Pill tone="bad">Withdrawn</Pill>}</Link>)}</div></div>); })}
      </div></section>
    </>
  );
}

export function TeamDetail({ id }) {
  const { club, division, team } = useLeague();
  const query = useQuery(api, `/league/teams/${id}`);
  const t = query.data?.team;
  const tables = useQuery(api, t && `/league/tables/${t.divisionId}`);
  useDocumentTitle(t ? `${t.name} · JFL` : 'Team · JFL');
  return (
    <Async query={query}>{({ team: t, club: c, squad, staff, fixtures }) => {
      const rows = tables.data?.table || Object.values(tables.data?.groups || {}).flat();
      const mine = rows.find((r) => r.id === t.id);
      return (
        <>
          <PageHead crumbs={[['/teams', 'Teams'], [null, t.name]]} title={t.name} lede={`${division(t.divisionId)?.name}${t.regStatus === 'withdrawn' ? ' · Withdrawn' : ''}`}><Crest club={club(t.id)} size={88} /></PageHead>
          <section className="section section--tight"><div className="wrap stack" style={{ '--gap': '36px' }}>
            {c?.bio && <p className="lede" style={{ margin: 0 }}>{c.bio}</p>}
            {mine && <div className="stat-grid">{[['Position', `#${mine.pos}`], ['Played', mine.p], ['Points', mine.pts], ['Goal difference', mine.gd > 0 ? `+${mine.gd}` : mine.gd]].map(([k, v]) => <div className="stat" key={k}><b>{v}</b><small>{k}</small></div>)}</div>}
            <div><h2 style={{ marginBottom: 14 }}>Fixtures &amp; results</h2><FixtureList fixtures={fixtures} grouped={false} showDivision={false} /></div>
            <div><h2 style={{ marginBottom: 14 }}>Squad</h2>
              <DataTable caption="Squad" rows={squad} initialSort={{ key: 'number', dir: 'asc' }} empty="No registered players yet." columns={[
                { key: 'number', header: 'No.', numeric: true }, { key: 'last', header: 'Player', render: (p) => <Link to={`/players/${p.id}`}>{p.first} {p.last}</Link> }, { key: 'pos', header: 'Position', render: (p) => POS[p.pos] },
                { key: 'eligibility', header: 'Status', render: (p) => <Pill tone={ELIG[p.eligibility][1]}>{ELIG[p.eligibility][0]}</Pill> }]} /></div>
            {staff.length > 0 && <div><h2 style={{ marginBottom: 14 }}>Team officials</h2><dl className="kv">{staff.map((s) => <><dt key={`${s.id}t`}>{s.role}</dt><dd key={s.id}>{s.first} {s.last}</dd></>)}</dl></div>}
          </div></section>
        </>
      );
    }}</Async>
  );
}

export function Players() {
  useDocumentTitle('Players · JFL');
  const { season, activeTeams, team } = useLeague();
  const [q, setQ] = useQueryParams();
  const [text, setText] = useState(q.get('q') || '');
  const search = useDebounced(text, 300);
  const teamId = q.get('team') || '', pos = q.get('pos') || '', page = Number(q.get('page') || 0), LIMIT = 24;
  const list = useQuery(api, '/league/players', { seasonId: season.id, q: search, teamId, pos, limit: LIMIT, offset: page * LIMIT });
  return (
    <>
      <PageHead title="Players" lede={`Registered players for ${season.name}.`} />
      <section className="section section--tight"><div className="wrap">
        <div className="filters">
          <Input label="Search by name" type="search" value={text} onChange={(e) => { setText(e.target.value); setQ({ page: null }); }} />
          <Select label="Team" value={teamId} onChange={(e) => setQ({ team: e.target.value, page: null })} placeholder="All teams" options={[...activeTeams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ value: t.id, label: t.name }))} />
          <Select label="Position" value={pos} onChange={(e) => setQ({ pos: e.target.value, page: null })} placeholder="All positions" options={Object.entries(POS).map(([value, label]) => ({ value, label }))} />
        </div>
        <Async query={list} skeleton={<Skeleton lines={8} height={44} />}>{({ total, rows }) => rows.length ? (
          <>
            <p className="muted small" aria-live="polite">{total} players</p>
            <div className="card-grid">{rows.map((p) => <Link key={p.id} to={`/players/${p.id}`} className="card"><div className="team"><span className="avatar" aria-hidden="true">{initials(p.first, p.last)}</span><span><strong>{p.first} {p.last}</strong><br /><span className="muted small">{POS[p.pos]} · {team(p.teamId)?.name}</span></span></div><div className="row"><span className="num-badge">{p.number}</span><Pill tone={ELIG[p.eligibility][1]}>{ELIG[p.eligibility][0]}</Pill></div></Link>)}</div>
            <div className="row row--between" style={{ marginTop: 24 }}><Button variant="ghost" disabled={page === 0} onClick={() => setQ({ page: page - 1 || null })}>← Previous</Button><span className="muted">Page {page + 1} of {Math.max(1, Math.ceil(total / LIMIT))}</span><Button variant="ghost" disabled={(page + 1) * LIMIT >= total} onClick={() => setQ({ page: page + 1 })}>Next →</Button></div>
          </>) : <EmptyState title="No players found">Try a different name or clear the filters.</EmptyState>}</Async>
      </div></section>
    </>
  );
}

export function PlayerDetail({ id }) {
  const { team, seasons } = useLeague();
  const query = useQuery(api, `/league/players/${id}`);
  useDocumentTitle(query.data ? `${query.data.player.first} ${query.data.player.last} · JFL` : 'Player · JFL');
  return (
    <Async query={query}>{({ player: p, registrations, eligibility, stats }) => (
      <>
        <PageHead crumbs={[['/players', 'Players'], [null, `${p.first} ${p.last}`]]} title={`${p.first} ${p.last}`} lede={POS[p.pos]}><Pill tone={ELIG[eligibility][1]}>{ELIG[eligibility][0]}</Pill></PageHead>
        <section className="section section--tight"><div className="wrap stack" style={{ '--gap': '32px' }}>
          {stats && <div className="stat-grid">{[['Appearances', stats.apps], ['Goals', stats.goals], ['Yellow cards', stats.yellow], ['Red cards', stats.red]].map(([k, v]) => <div className="stat" key={k}><b>{v}</b><small>{k}</small></div>)}</div>}
          <div><h2 style={{ marginBottom: 14 }}>Registration history</h2><DataTable caption="Registrations" rows={registrations} empty="No registrations." columns={[
            { key: 'seasonId', header: 'Season', render: (r) => seasons.find((s) => s.id === r.seasonId)?.name }, { key: 'teamId', header: 'Team', render: (r) => <Link to={`/teams/${r.teamId}`}>{team(r.teamId)?.name || r.teamId}</Link> },
            { key: 'number', header: 'No.', numeric: true }, { key: 'status', header: 'Status', render: (r) => <Pill tone={r.status === 'approved' ? 'ok' : r.status === 'pending' ? 'warn' : 'neutral'}>{r.status}</Pill> }]} /></div>
        </div></section>
      </>
    )}</Async>
  );
}

export function Officials() {
  useDocumentTitle('Match officials · JFL');
  const query = useQuery(api, '/league/officials');
  return (
    <>
      <PageHead title="Match officials" lede="Referees, assistants and commissioners appointed to JFL matches." />
      <section className="section section--tight"><div className="wrap"><Async query={query} skeleton={<Skeleton lines={6} />}>{(rows) => <DataTable caption="Officials" rows={rows} initialSort={{ key: 'last', dir: 'asc' }} columns={[
        { key: 'last', header: 'Name', render: (o) => <Link to={`/officials/${o.id}`}>{o.first} {o.last}</Link> }, { key: 'roles', header: 'Roles', render: (o) => o.roles.join(', '), sortable: false }, { key: 'experience', header: 'Years', numeric: true },
        { key: 'verified', header: 'Qualification', render: (o) => <Pill tone={o.verified ? 'ok' : 'neutral'}>{o.verified ? 'Verified' : 'Declared'}</Pill>, sortValue: (o) => +o.verified }]} />}</Async></div></section>
    </>
  );
}
export function OfficialDetail({ id }) {
  const query = useQuery(api, `/league/officials/${id}`);
  return (
    <Async query={query}>{({ official: o, fixtures }) => (
      <>
        <PageHead crumbs={[['/officials', 'Officials'], [null, `${o.first} ${o.last}`]]} title={`${o.first} ${o.last}`} lede={o.roles.join(' · ')} />
        <section className="section section--tight"><div className="wrap stack" style={{ '--gap': '28px' }}>
          <dl className="kv"><dt>Qualification</dt><dd>{o.qualification} {o.verified ? <Pill tone="ok">Verified</Pill> : <Pill>Declared</Pill>}</dd><dt>Experience</dt><dd>{o.experience} years</dd></dl>
          <div><h2 style={{ marginBottom: 14 }}>Appointments</h2><FixtureList fixtures={fixtures} grouped={false} /></div>
        </div></section>
      </>
    )}</Async>
  );
}
