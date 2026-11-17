import { useState } from 'react';
import { Async, Button, DataTable, EmptyState, FormError, FormGrid, Input, Modal, Pill, RequireAuth, Select, Skeleton, Tabs, TabPanel, Textarea, fmtDate, todayISO, useAuth, useDocumentTitle, useForm, useQuery, useQueryParams, useToast, Link } from '@jalingo/shared';
import { api } from '../api.js';
import { useLeague } from '../data.jsx';
import { FixtureList, PageHead, StatusPill, TeamName, slotText } from '../components/ui.jsx';

export default function Portal() {
  useDocumentTitle('My portal · JFL');
  return (
    <RequireAuth loginTitle="Sign in" loginNote="For clubs, coaches, players, match officials, media and partners.">
      <PortalHome />
    </RequireAuth>
  );
}

function PortalHome() {
  const { user } = useAuth();
  const me = useQuery(api, '/league/me');
  const label = { team: 'Team manager', coach: 'Coach', player: 'Player', referee: 'Match official', media: 'Media', sponsor: 'Partner', admin: 'Administrator' }[user.role];
  return (
    <>
      <PageHead title="My portal" lede={`${user.name} · ${label}`} />
      <section className="section section--tight"><div className="wrap">
        <Async query={me} skeleton={<Skeleton lines={6} height={36} />}>{(d) => {
          if (['team', 'coach'].includes(user.role)) return <TeamPortal d={d} reload={me.reload} />;
          if (user.role === 'referee') return <RefereePortal d={d} reload={me.reload} />;
          if (user.role === 'player') return <PlayerPortal d={d} />;
          if (user.role === 'admin') return <EmptyState title="You’re signed in as an administrator" action={<Link className="btn btn--primary" to="/admin">Open administration</Link>} />;
          return <EmptyState title={`Welcome, ${user.name}`} action={<Link className="btn btn--primary" to="/competition">Competition information</Link>}>Your account gives you access to the public competition information. Role-specific tools for {label.toLowerCase()} accounts are managed by the competition office.</EmptyState>;
        }}</Async>
      </div></section>
    </>
  );
}

/* ---------------- team manager / coach ---------------- */
function TeamPortal({ d, reload }) {
  const [q, setQ] = useQueryParams();
  const tab = q.get('tab') || 'fixtures';
  const [sheet, setSheet] = useState(null);
  const [respond, setRespond] = useState(null);
  const toast = useToast();
  const { team: t, fixtures, cases } = d;
  const upcoming = fixtures.filter((f) => f.date >= todayISO() && ['scheduled', 'postponed'].includes(f.status));
  const mySide = (f) => (f.resolved.homeId === t.id ? 'h' : 'a');
  const squad = useQuery(api, `/league/teams/${t.id}`);
  return (
    <>
      <p className="lede" style={{ marginTop: 0 }}>{t.name}</p>
      <Tabs value={tab} onChange={(v) => setQ({ tab: v })} label="Team portal" tabs={[{ key: 'fixtures', label: 'Fixtures & team sheets' }, { key: 'squad', label: 'Squad' }, { key: 'cases', label: 'Discipline', badge: cases.filter((c) => !['resolved', 'closed', 'rejected'].includes(c.status)).length }]} />
      <TabPanel id="fixtures" active={tab === 'fixtures'}>
        {upcoming.length ? <ul className="fixture-list" style={{ listStyle: 'none', padding: 0 }}>{upcoming.map((f) => { const sub = f.teamSheets?.[mySide(f)]; return (
          <li key={f.id} className="panel panel__body row row--between"><div className="row"><TeamName id={f.resolved.homeId} slot={slotText(f.slotH)} link={false} /><span className="muted">v</span><TeamName id={f.resolved.awayId} slot={slotText(f.slotA)} link={false} /><span className="muted small">{fmtDate(f.date)} · {f.time}</span></div><div className="row">{sub ? <Pill tone="ok">Team sheet submitted</Pill> : <Pill tone="warn">Team sheet due</Pill>}<Button size="sm" variant={sub ? 'ghost' : 'primary'} onClick={() => setSheet(f)} disabled={!f.resolved.homeId || !f.resolved.awayId}>{sub ? 'Update' : 'Submit'} team sheet</Button></div></li>); })}</ul> : <EmptyState title="No upcoming fixtures" />}
        <h2 style={{ margin: '36px 0 14px' }}>Results</h2><FixtureList fixtures={fixtures.filter((f) => f.result).slice(-6).reverse()} grouped={false} showDivision={false} />
      </TabPanel>
      <TabPanel id="squad" active={tab === 'squad'}><Async query={squad}>{({ squad: s }) => <DataTable caption="Squad" rows={s} initialSort={{ key: 'number', dir: 'asc' }} columns={[{ key: 'number', header: 'No.', numeric: true }, { key: 'last', header: 'Player', render: (p) => `${p.first} ${p.last}` }, { key: 'pos', header: 'Pos.' }, { key: 'eligibility', header: 'Status', render: (p) => <Pill tone={p.eligibility === 'eligible' ? 'ok' : 'bad'}>{p.eligibility}</Pill> }]} />}</Async></TabPanel>
      <TabPanel id="cases" active={tab === 'cases'}>{cases.length ? <div className="stack">{cases.map((c) => <div key={c.id} className="panel panel__body row row--between"><div><strong>{c.type}: {c.category}</strong><p className="muted small" style={{ margin: 0 }}>{c.id} · {fmtDate(c.date)} · {c.decision || 'Awaiting decision'}</p></div><div className="row"><Pill tone="info">{c.status}</Pill><Button size="sm" variant="ghost" onClick={() => setRespond(c)}>Add response</Button></div></div>)}</div> : <EmptyState title="No cases involving your team" />}</TabPanel>
      {sheet && squad.data && <TeamSheetForm fixture={sheet} squad={squad.data.squad} existing={sheet.teamSheets?.[mySide(sheet)]} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); reload(); toast('Team sheet submitted.'); }} />}
      {respond && <CaseResponse c={respond} onClose={() => setRespond(null)} onSaved={() => { setRespond(null); reload(); toast('Response recorded.'); }} />}
    </>
  );
}

function TeamSheetForm({ fixture, squad, existing, onClose, onSaved }) {
  const [starters, setStarters] = useState(existing?.starters || []);
  const [subs, setSubs] = useState(existing?.subs || []);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const toggle = (list, set, other, setOther, id, max) => { if (list.includes(id)) return set(list.filter((x) => x !== id)); if (list.length >= max) return; set([...list, id]); setOther(other.filter((x) => x !== id)); };
  const save = async () => { setBusy(true); setErr(null); try { await api(`/league/fixtures/${fixture.id}/team-sheet`, { method: 'POST', body: { starters, subs } }); onSaved(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <Modal open onClose={onClose} size="lg" title="Team sheet" eyebrow={`${fmtDate(fixture.date, 'long')} · ${fixture.time}`} footer={<><span className="muted" style={{ marginRight: 'auto' }}>{starters.length}/11 starters · {subs.length}/7 subs</span><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Submit team sheet</Button></>}>
      <FormError error={err} />
      <DataTable caption="Select your squad" rows={squad} initialSort={{ key: 'number', dir: 'asc' }} columns={[
        { key: 'number', header: 'No.', numeric: true }, { key: 'last', header: 'Player', render: (p) => `${p.first} ${p.last}${p.eligibility !== 'eligible' ? ` (${p.eligibility})` : ''}` }, { key: 'pos', header: 'Pos.' },
        { key: 'x1', header: 'Starts', sortable: false, render: (p) => <input type="checkbox" aria-label={`${p.first} ${p.last} starts`} disabled={p.eligibility !== 'eligible'} checked={starters.includes(p.id)} onChange={() => toggle(starters, setStarters, subs, setSubs, p.id, 11)} /> },
        { key: 'x2', header: 'Sub', sortable: false, render: (p) => <input type="checkbox" aria-label={`${p.first} ${p.last} substitute`} disabled={p.eligibility !== 'eligible'} checked={subs.includes(p.id)} onChange={() => toggle(subs, setSubs, starters, setStarters, p.id, 7)} /> }]} />
    </Modal>
  );
}

function CaseResponse({ c, onClose, onSaved }) {
  const f = useForm({ note: '' }, async (v) => { await api(`/league/discipline/${c.id}/response`, { method: 'POST', body: v }); onSaved(); });
  return <Modal open onClose={onClose} size="sm" title={`Respond to ${c.id}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={f.submitting} onClick={f.submit}>Send response</Button></>}><form onSubmit={f.submit} noValidate><Textarea label="Your response" required {...f.bind('note')} error={f.errors.note} /><FormError error={f.formError && !f.errors.note ? f.formError : null} /></form></Modal>;
}

/* ---------------- referee ---------------- */
const ROLE = { ref: 'Referee', ar1: 'Assistant referee 1', ar2: 'Assistant referee 2', comm: 'Match commissioner' };
function RefereePortal({ d, reload }) {
  const { official, fixtures } = d;
  const toast = useToast();
  const [q, setQ] = useQueryParams();
  const tab = q.get('tab') || 'appointments';
  const [report, setReport] = useState(null);
  const [incident, setIncident] = useState(false);
  const myRole = (f) => Object.entries(f.officials).find(([, a]) => a?.id === official.id);
  const respond = async (f, slot, to) => { try { await api(`/league/fixtures/${f.id}/appointments/${slot}/respond`, { method: 'POST', body: { to } }); toast(`Appointment ${to}.`); reload(); } catch (e) { toast(e.message, 'bad'); } };
  const upcoming = fixtures.filter((f) => f.date >= todayISO() && !f.result), past = fixtures.filter((f) => f.date <= todayISO());
  return (
    <>
      <Tabs value={tab} onChange={(v) => setQ({ tab: v })} label="Referee portal" tabs={[{ key: 'appointments', label: 'Appointments', badge: upcoming.filter((f) => myRole(f)?.[1].status === 'pending').length }, { key: 'reports', label: 'Match reports' }]} />
      <TabPanel id="appointments" active={tab === 'appointments'}>{upcoming.length ? <div className="stack">{upcoming.map((f) => { const [slot, a] = myRole(f); return (
        <div key={f.id} className="panel panel__body row row--between"><div className="row"><TeamName id={f.resolved.homeId} slot={slotText(f.slotH)} link={false} /><span className="muted">v</span><TeamName id={f.resolved.awayId} slot={slotText(f.slotA)} link={false} /><span className="muted small">{fmtDate(f.date)} · {f.time} · {ROLE[slot]}</span></div>
          <div className="row"><Pill tone={a.status === 'confirmed' ? 'ok' : a.status === 'declined' ? 'bad' : 'warn'}>{a.status}</Pill>{a.status !== 'confirmed' && <Button size="sm" onClick={() => respond(f, slot, 'confirmed')}>Confirm</Button>}{a.status !== 'declined' && <Button size="sm" variant="ghost" onClick={() => respond(f, slot, 'declined')}>Decline</Button>}</div></div>); })}</div> : <EmptyState title="No upcoming appointments" />}</TabPanel>
      <TabPanel id="reports" active={tab === 'reports'}>
        <div className="row row--between" style={{ marginBottom: 14 }}><p className="muted" style={{ margin: 0 }}>Submit a report within 24 hours of full time. Results stay provisional until approved.</p><Button variant="ghost" onClick={() => setIncident(true)}>Report an incident</Button></div>
        {past.length ? <div className="stack">{past.map((f) => <div key={f.id} className="panel panel__body row row--between"><div className="row"><TeamName id={f.resolved.homeId} link={false} /><span className="muted">v</span><TeamName id={f.resolved.awayId} link={false} /><span className="muted small">{fmtDate(f.date)}</span></div><div className="row"><StatusPill status={f.status} />{(!f.result || f.approval === 'disputed') && myRole(f)?.[0] === 'ref' && <Button size="sm" onClick={() => setReport(f)}>Submit report</Button>}</div></div>)}</div> : <EmptyState title="No past matches yet" />}
      </TabPanel>
      {report && <ReportForm fixture={report} onClose={() => setReport(null)} onSaved={() => { setReport(null); reload(); toast('Report submitted. The result is awaiting approval.'); }} />}
      {incident && <IncidentForm fixtures={past} onClose={() => setIncident(false)} onSaved={() => { setIncident(false); toast('Incident reported.'); }} />}
    </>
  );
}

function ReportForm({ fixture, onClose, onSaved }) {
  const { team } = useLeague();
  const home = useQuery(api, `/league/teams/${fixture.resolved.homeId}`), away = useQuery(api, `/league/teams/${fixture.resolved.awayId}`);
  const [h, setH] = useState(0), [a, setA] = useState(0), [goals, setGoals] = useState({}), [cards, setCards] = useState([]);
  const [text, setText] = useState(''), [att, setAtt] = useState('');
  const [err, setErr] = useState(null), [busy, setBusy] = useState(false);
  const hs = home.data?.squad || [], as = away.data?.squad || [], all = [...hs, ...as];
  const goalRows = (side, n) => Array.from({ length: n }, (_, i) => `${side}${i}`);
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const gl = [...goalRows('h', h).map((k) => ({ side: 'h', ...goals[k] })), ...goalRows('a', a).map((k) => ({ side: 'a', ...goals[k] }))];
      if (gl.some((g) => !g.playerId || g.min === undefined || g.min === '')) throw new Error('Choose a scorer and enter the minute for every goal.');
      await api(`/league/fixtures/${fixture.id}/report`, { method: 'POST', body: { h, a, attendance: att === '' ? undefined : Number(att), text, goals: gl.map((g) => ({ ...g, min: Number(g.min) })), cards: cards.filter((c) => c.playerId).map((c) => ({ ...c, min: Number(c.min) })) } });
      onSaved();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const goalInputs = (side, n, squad) => goalRows(side, n).map((k, i) => (
    <div key={k} className="row" style={{ marginBottom: 8 }}><Select label={`Goal ${i + 1} scorer`} placeholder="Scorer" value={goals[k]?.playerId || ''} onChange={(e) => setGoals({ ...goals, [k]: { ...goals[k], playerId: e.target.value } })} options={squad.map((p) => ({ value: p.id, label: `${p.number} ${p.first} ${p.last}` }))} /><Input label="Minute" type="number" min="0" max="130" value={goals[k]?.min ?? ''} onChange={(e) => setGoals({ ...goals, [k]: { ...goals[k], min: e.target.value } })} style={{ width: 90 }} /></div>));
  return (
    <Modal open onClose={onClose} size="lg" title="Match report" eyebrow={`${team(fixture.resolved.homeId)?.name} v ${team(fixture.resolved.awayId)?.name}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit} disabled={!home.data || !away.data}>Submit report</Button></>}>
      <FormError error={err} />
      <FormGrid><Input label={`${team(fixture.resolved.homeId)?.name} goals`} type="number" min="0" value={h} onChange={(e) => setH(Math.max(0, Number(e.target.value) || 0))} /><Input label={`${team(fixture.resolved.awayId)?.name} goals`} type="number" min="0" value={a} onChange={(e) => setA(Math.max(0, Number(e.target.value) || 0))} /></FormGrid>
      {h > 0 && <><h3>Home scorers</h3>{goalInputs('h', h, hs)}</>}{a > 0 && <><h3>Away scorers</h3>{goalInputs('a', a, as)}</>}
      <h3 style={{ margin: '16px 0 8px' }}>Cards</h3>
      {cards.map((c, i) => <div key={i} className="row" style={{ marginBottom: 8 }}><Select label="Player" placeholder="Player" value={c.playerId || ''} onChange={(e) => setCards(cards.map((x, j) => (j === i ? { ...x, playerId: e.target.value } : x)))} options={all.map((p) => ({ value: p.id, label: `${p.first} ${p.last}` }))} /><Select label="Card" value={c.type} onChange={(e) => setCards(cards.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} options={['yellow', 'red']} /><Input label="Minute" type="number" value={c.min} onChange={(e) => setCards(cards.map((x, j) => (j === i ? { ...x, min: e.target.value } : x)))} style={{ width: 90 }} /><Button size="sm" variant="ghost" onClick={() => setCards(cards.filter((_, j) => j !== i))}>Remove</Button></div>)}
      <Button size="sm" variant="ghost" onClick={() => setCards([...cards, { type: 'yellow', min: '' }])}>Add card</Button>
      <div style={{ marginTop: 16 }}><FormGrid><Input label="Attendance" type="number" optional value={att} onChange={(e) => setAtt(e.target.value)} /><Textarea label="Match report" required hint="Conduct, injuries and anything the competition office should know." value={text} onChange={(e) => setText(e.target.value)} /></FormGrid></div>
    </Modal>
  );
}

function IncidentForm({ fixtures, onClose, onSaved }) {
  const { team } = useLeague();
  const f = useForm({ matchId: '', category: '', note: '' }, async (v) => { await api('/league/incidents', { method: 'POST', body: v }); onSaved(); });
  const e = f.errors;
  return (
    <Modal open onClose={onClose} title="Report an incident" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={f.submitting} onClick={f.submit}>Submit</Button></>}>
      <form onSubmit={f.submit} noValidate><FormGrid>
        <Select label="Match" full placeholder="Choose a match" options={fixtures.map((x) => ({ value: x.id, label: `${fmtDate(x.date)} · ${team(x.resolved.homeId)?.name} v ${team(x.resolved.awayId)?.name}` }))} {...f.bind('matchId')} error={e.matchId} />
        <Select label="Category" full placeholder="Choose a category" options={['Player misconduct', 'Technical area conduct', 'Spectator behaviour', 'Facilities / safety', 'Other']} {...f.bind('category')} error={e.category} />
        <Textarea label="What happened?" hint="At least 20 characters." {...f.bind('note')} error={e.note} /></FormGrid><FormError error={f.formError && !Object.keys(e).length ? f.formError : null} /></form>
    </Modal>
  );
}

/* ---------------- player ---------------- */
function PlayerPortal({ d }) {
  const { team, seasons } = useLeague();
  const { player: p, eligibility, registrations } = d.player;
  const TONE = { eligible: 'ok', suspended: 'bad', pending: 'warn', inactive: 'neutral' };
  return (
    <div className="stack" style={{ '--gap': '24px' }}>
      <div className="panel panel__body row row--between"><div><h2>{p.first} {p.last}</h2><p className="muted" style={{ margin: 0 }}>{p.pos} · born {p.birthYear}</p></div><Pill tone={TONE[eligibility]}>{eligibility}</Pill></div>
      <DataTable caption="Registrations" rows={registrations} columns={[{ key: 'seasonId', header: 'Season', render: (r) => seasons.find((s) => s.id === r.seasonId)?.name }, { key: 'teamId', header: 'Team', render: (r) => team(r.teamId)?.name }, { key: 'number', header: 'No.', numeric: true }, { key: 'status', header: 'Status' }]} />
      <p className="muted small">Registration changes are handled by your club and approved by the competition office.</p>
    </div>
  );
}
