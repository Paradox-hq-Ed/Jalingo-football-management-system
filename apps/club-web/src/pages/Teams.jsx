import { useMemo, useState } from 'react';
import { Async, DataTable, EmptyState, Icon, Input, Link, NavLink, Pill, Select, Skeleton, fmt, toDate, useDebounced, useDocumentTitle, useQuery, useQueryParams } from '@jalingo/shared';
import { api } from '../api.js';
import { useClub } from '../data.jsx';
import { PageHero, PlayerCard, SampleTag, monogram } from '../components/common.jsx';

const monthsLeft = (iso) => { const d = toDate(iso), n = new Date(); return (d.getFullYear() - n.getFullYear()) * 12 + d.getMonth() - n.getMonth(); };

export default function Teams({ panel, squad }) {
  useDocumentTitle('Teams · Eland FC');
  return (
    <>
      <PageHero eyebrow="Teams" title="Squads, staff & history." lede="Every squad, the people who run them, and the club’s all-time player register." />
      <nav className="subnav" aria-label="Teams sections"><div className="wrap">
        <NavLink to="/teams/squads">Squads</NavLink><NavLink to="/teams/staff">Technical &amp; medical</NavLink><NavLink to="/teams/register">Player register</NavLink>
      </div></nav>
      <section className="section" style={{ paddingTop: 48 }}><div className="wrap">
        {panel === 'staff' ? <Staff /> : panel === 'register' ? <Register /> : <Squads squadId={squad} />}
      </div></section>
    </>
  );
}

function Squads({ squadId = 'first' }) {
  const { squads, positions, availability, contractTypes, personById, squadById, season } = useClub();
  const [q, setQ] = useQueryParams();
  const squad = squadById(squadId) || squads[0];
  const pos = q.get('pos') || 'ALL', view = q.get('view') || 'profiles';
  const players = useQuery(api, '/club/players', { squad: squad.id });
  const coach = squad.coach ? personById(squad.coach) : null;
  const openPlayer = (id, tab) => setQ({ player: id, tab }, { replace: false });

  return (
    <>
      <div className="chips" role="group" aria-label="Choose a squad">{squads.map((s) => <Link key={s.id} to={`/teams/squads/${s.id}`} className="chip" aria-current={s.id === squad.id ? 'page' : undefined} replace scroll={false}>{s.name} <small>{s.status === 'proposed' ? 'Proposed' : s.category}</small></Link>)}</div>
      <Async query={players} skeleton={<Skeleton lines={6} height={40} />}>{(list) => {
        const shown = list.filter((p) => pos === 'ALL' || p.pos === pos);
        const top = (key, f = () => true) => list.filter(f).sort((a, b) => (b.sample[key] ?? 0) - (a.sample[key] ?? 0))[0];
        const leaders = [['Top scorer', top('goals'), 'goals', 'goals'], ['Most assists', top('assists'), 'assists', 'assists'], ['Most appearances', top('apps'), 'apps', 'appearances'], ['Clean sheets', top('cleanSheets', (p) => p.pos === 'GK'), 'cleanSheets', 'clean sheets']].filter(([, p]) => p);
        return (
          <>
            <div className="squad-head">
              <div>
                <h2>{squad.name}</h2>
                <div className="squad-head__meta"><span>{squad.category} · {squad.gender}</span><SampleTag>{squad.status === 'proposed' ? 'Proposed pathway · not confirmed' : 'Demo squad'}</SampleTag></div>
                <p className="muted" style={{ margin: '14px 0 0', maxWidth: '56ch' }}>{squad.summary}</p>
                {coach && <button type="button" className="text-link" style={{ background: 'none', border: 0, padding: 0, marginTop: 12 }} onClick={() => setQ({ person: coach.id }, { replace: false })}>{coach.role}: name to be confirmed <Icon id="i-arrow" /></button>}
              </div>
              {list.length > 0 && <div className="stats-row" aria-label="Squad summary">
                <div><b>{list.length}</b><small>Players</small></div><div><b>{list.filter((p) => p.availability === 'available').length}</b><small>Available</small></div>
                <div><b>{list.filter((p) => p.contract.status.key === 'expiring').length}</b><small>Contracts expiring</small></div><div><b>{list.filter((p) => ['trial', 'loan'].includes(p.contract.type)).length}</b><small>Trial / loan</small></div></div>}
            </div>
            {!list.length ? (
              <EmptyState title="This squad hasn’t been set up" action={<div className="btn-row" style={{ justifyContent: 'center' }}><Link className="btn btn--ghost" to="/teams/squads/first">View the first team</Link><Link className="btn btn--ghost" to="/contact/general">Ask about this squad</Link></div>}>
                The {squad.name} page is ready to use if the club decides to run this squad: profiles, contracts, staff and fixtures, managed in the same way as the first team.</EmptyState>
            ) : (
              <>
                <div className="row row--between" style={{ marginBottom: 20 }}>
                  <div className="chips" style={{ margin: 0 }} role="group" aria-label="Filter by position">
                    {[['ALL', 'All'], ...Object.entries(positions).map(([k, v]) => [k, `${v}s`])].map(([k, label]) => <button key={k} type="button" className="chip" aria-pressed={pos === k} onClick={() => setQ({ pos: k === 'ALL' ? null : k })}>{label} <small>{k === 'ALL' ? list.length : list.filter((p) => p.pos === k).length}</small></button>)}
                  </div>
                  <div className="view-toggle" role="group" aria-label="View">{[['profiles', 'Profiles'], ['contracts', 'Contracts']].map(([k, l]) => <button key={k} type="button" aria-pressed={view === k} onClick={() => setQ({ view: k === 'profiles' ? null : k })}>{l}</button>)}</div>
                </div>
                {!shown.length ? <EmptyState title="No players in this position" /> : view === 'contracts' ? (
                  <>
                    <DataTable caption={`${squad.name} contracts and availability`} rows={shown} onRowClick={(p) => openPlayer(p.id, 'contract')} columns={[
                      { key: 'num', header: 'Player', render: (p) => `No. ${p.num} · ${positions[p.pos]}`, sortValue: (p) => p.num },
                      { key: 'type', header: 'Contract', render: (p) => contractTypes[p.contract.type], sortValue: (p) => p.contract.type },
                      { key: 'start', header: 'Started', render: (p) => fmt.monthYear.format(toDate(p.contract.startDate)), sortValue: (p) => p.contract.startDate },
                      { key: 'end', header: 'Expires', render: (p) => <>{fmt.monthYear.format(toDate(p.contract.endDate))} <span className="muted small">· {monthsLeft(p.contract.endDate)} mo</span></>, sortValue: (p) => p.contract.endDate },
                      { key: 'status', header: 'Status', render: (p) => <Pill tone={{ active: 'ok', expiring: 'warn' }[p.contract.status.key] || 'info'}>{p.contract.status.label}</Pill>, sortValue: (p) => p.contract.status.key },
                      { key: 'avail', header: 'Availability', render: (p) => <Pill tone={p.availability === 'available' ? 'ok' : 'bad'}>{availability[p.availability]}</Pill>, sortValue: (p) => p.availability }]} />
                    <p className="muted small" style={{ marginTop: 16 }}>Only public contract information is shown. Wages, fees and other financial terms are confidential and are never published.</p>
                  </>
                ) : <div className="squad-grid">{shown.map((p) => <PlayerCard key={p.id} p={p} onOpen={openPlayer} />)}</div>}
                <div className="leaders" aria-label="Season leaders">{leaders.map(([label, p, key, unit]) => <button key={label} type="button" className="leader" onClick={() => openPlayer(p.id)}><small>{label}</small><b>{p.sample[key]}</b><span>{unit} · No. {p.num}, {positions[p.pos]}</span></button>)}</div>
                <p className="muted small" style={{ marginTop: 12 }}>{season} season leaders · sample statistics</p>
              </>
            )}
          </>
        );
      }}</Async>
    </>
  );
}

function Staff() {
  const { people, departments, personById } = useClub();
  const [, setQ] = useQueryParams();
  return ['technical', 'medical', 'operations'].map((dept) => {
    const list = people.filter((p) => p.dept === dept);
    return (
      <div className="dept" key={dept}>
        <div className="dept__head"><h3>{departments[dept].name}</h3><p>{departments[dept].blurb} <strong>{list.length} roles.</strong></p></div>
        <ul className="staff-list">{list.map((p) => (
          <li key={p.id}><button type="button" className="staff-row" onClick={() => setQ({ person: p.id }, { replace: false })}>
            <span className="monogram" aria-hidden="true">{monogram(p.role)}</span>
            <span><span className="staff-row__role">{p.role}</span><span className="staff-row__name">Name to be confirmed</span></span>
            <span className="staff-row__cell"><small>Works with</small><span>{p.squads}</span></span>
            <span className="staff-row__cell"><small>Reports to</small><span>{p.reportsTo ? personById(p.reportsTo).role : '—'}</span></span>
            <Icon id="i-chevron" /></button></li>))}</ul>
      </div>
    );
  });
}

function Register() {
  const { squads, positions, squadById } = useClub();
  const [, setQ] = useQueryParams();
  const current = useQuery(api, '/club/players');
  const former = useQuery(api, '/club/former');
  const [f, setF] = useState({ q: '', status: 'all', squad: 'all', pos: 'all' });
  const search = useDebounced(f.q);
  const rows = useMemo(() => {
    if (!current.data || !former.data) return null;
    const all = [
      ...current.data.map((p) => ({ reg: p.reg, kind: 'current', playerId: p.id, squad: p.squad, pos: p.pos, from: p.career.some((c) => c.season === '2025/26') ? 2025 : 2026, to: null, apps: p.career.reduce((n, c) => n + c.apps, 0), goals: p.career.reduce((n, c) => n + c.goals, 0) })),
      ...former.data.map((r) => ({ ...r, kind: 'former' }))];
    const s = search.trim().toLowerCase();
    return { all, rows: all.filter((r) => (f.status === 'all' || r.kind === f.status) && (f.squad === 'all' || r.squad === f.squad) && (f.pos === 'all' || r.pos === f.pos) && (!s || [r.reg, squadById(r.squad).name, positions[r.pos], r.departure, r.from, r.to ?? 'present'].join(' ').toLowerCase().includes(s))) };
  }, [current.data, former.data, f.status, f.squad, f.pos, search, positions, squadById]);

  if (current.error || former.error) return <Async query={current.error ? current : former} />;
  if (!rows) return <Skeleton lines={8} height={36} />;
  const { all } = rows, fm = all.filter((r) => r.kind === 'former'), most = (k) => [...all].sort((a, b) => b[k] - a[k])[0];
  return (
    <>
      <div className="stats-row" style={{ marginBottom: 28 }}>
        <div><b>{all.length}</b><small>All-time players</small></div><div><b>{all.length - fm.length}</b><small>Current</small></div><div><b>{fm.length}</b><small>Former</small></div>
        <div><b>{most('apps').apps}</b><small>Most appearances · {most('apps').reg}</small></div><div><b>{most('goals').goals}</b><small>Most goals · {most('goals').reg}</small></div>
      </div>
      <div className="filters">
        <Input label="Search" type="search" placeholder="Reg. no., squad, position…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <Select label="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} options={[{ value: 'all', label: 'All' }, { value: 'current', label: 'Current' }, { value: 'former', label: 'Former' }]} />
        <Select label="Squad" value={f.squad} onChange={(e) => setF({ ...f, squad: e.target.value })} options={[{ value: 'all', label: 'All squads' }, ...squads.filter((s) => all.some((r) => r.squad === s.id)).map((s) => ({ value: s.id, label: s.name }))]} />
        <Select label="Position" value={f.pos} onChange={(e) => setF({ ...f, pos: e.target.value })} options={[{ value: 'all', label: 'All positions' }, ...Object.entries(positions).map(([k, v]) => ({ value: k, label: v }))]} />
      </div>
      <p className="muted small" aria-live="polite">Showing {rows.rows.length} of {all.length} players</p>
      <DataTable caption="All-time player register" initialSort={{ key: 'reg', dir: 'asc' }} rows={rows.rows} rowKey="reg" empty="No players match. Try a different search or clear the filters."
        onRowClick={(r) => r.kind === 'current' && setQ({ player: r.playerId }, { replace: false })}
        columns={[
          { key: 'reg', header: 'Reg. no.', render: (r) => r.kind === 'current' ? r.reg : <span>{r.reg}</span> },
          { key: 'squad', header: 'Squad', render: (r) => squadById(r.squad).name }, { key: 'pos', header: 'Position', render: (r) => positions[r.pos] },
          { key: 'from', header: 'Seasons', render: (r) => `${r.from} – ${r.to ?? 'present'}` }, { key: 'apps', header: 'Apps', numeric: true }, { key: 'goals', header: 'Goals', numeric: true },
          { key: 'kind', header: 'Status', render: (r) => r.kind === 'current' ? <Pill tone="ok">Current</Pill> : <><Pill>Former</Pill> <span className="muted small">{r.departure}</span></> }]} />
    </>
  );
}
