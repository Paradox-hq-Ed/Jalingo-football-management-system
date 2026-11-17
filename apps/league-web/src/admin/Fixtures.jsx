import { useMemo, useState } from 'react';
import { Async, Button, Checkbox, DataTable, EmptyState, FormError, FormGrid, Input, Modal, Pill, Select, Skeleton, Tabs, TabPanel, Textarea, fmtDate, todayISO, useConfirm, useForm, useQuery, useQueryParams, useToast } from '@jalingo/shared';
import { api } from '../api.js';
import { useLeague } from '../data.jsx';
import { StatusPill, STATUS, TeamName, slotText } from '../components/ui.jsx';
import { writeWithOverride, conflictsOf } from './helpers.js';

const ROLE = { ref: 'Referee', ar1: 'Assistant referee 1', ar2: 'Assistant referee 2', comm: 'Match commissioner' };
const matchTitle = (f, team) => `${team(f.resolved.homeId)?.name || slotText(f.slotH)} v ${team(f.resolved.awayId)?.name || slotText(f.slotA)}`;

export function FixturesAdmin() {
  const [q, setQ] = useQueryParams();
  const tab = q.get('tab') || 'list';
  return (
    <>
      <Tabs value={tab} onChange={(t) => setQ({ tab: t })} label="Fixtures" tabs={[{ key: 'list', label: 'Schedule' }, { key: 'generate', label: 'Generator' }, { key: 'drafts', label: 'Drafts' }]} />
      <TabPanel id="list" active={tab === 'list'}><FixtureList /></TabPanel>
      <TabPanel id="generate" active={tab === 'generate'}><Generator /></TabPanel>
      <TabPanel id="drafts" active={tab === 'drafts'}><Drafts /></TabPanel>
    </>
  );
}

function FixtureList() {
  const { season, activeDivisions, team, venue } = useLeague();
  const [div, setDiv] = useState(''), [status, setStatus] = useState('');
  const query = useQuery(api, '/league/fixtures', { seasonId: season.id, divisionId: div, status });
  const [edit, setEdit] = useState(null), [appoint, setAppoint] = useState(null), [create, setCreate] = useState(false);
  const toast = useToast();
  const done = (msg) => { setEdit(null); setAppoint(null); setCreate(false); query.reload(); toast(msg); };
  return (
    <>
      <div className="filters">
        <Select label="Division" value={div} onChange={(e) => setDiv(e.target.value)} placeholder="All divisions" options={activeDivisions.map((d) => ({ value: d.id, label: d.short }))} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Any status" options={Object.entries(STATUS).map(([value, [label]]) => ({ value, label }))} />
        <Button onClick={() => setCreate(true)}>Add fixture</Button>
      </div>
      <Async query={query} skeleton={<Skeleton lines={8} height={34} />}>{(rows) => <DataTable caption="Fixtures" rows={rows} initialSort={{ key: 'date', dir: 'asc' }} columns={[
        { key: 'date', header: 'When', render: (f) => `${fmtDate(f.date)} ${f.time}`, sortValue: (f) => f.date + f.time }, { key: 'm', header: 'Match', render: (f) => matchTitle(f, team), sortValue: (f) => matchTitle(f, team) },
        { key: 'venueId', header: 'Venue', render: (f) => venue(f.venueId)?.name }, { key: 'status', header: 'Status', render: (f) => <StatusPill status={f.status} /> },
        { key: 'ref', header: 'Referee', sortable: false, render: (f) => (f.officials?.ref ? <Pill tone={f.officials.ref.status === 'confirmed' ? 'ok' : 'warn'}>{f.officials.ref.status}</Pill> : <Pill tone="bad">None</Pill>) },
        { key: 'act', header: '', sortable: false, render: (f) => <span className="row"><Button size="sm" variant="ghost" onClick={() => setEdit(f)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setAppoint(f)}>Officials</Button></span> }]} />}</Async>
      {edit && <FixtureForm fixture={edit} onClose={() => setEdit(null)} onSaved={() => done('Fixture updated.')} />}
      {create && <FixtureForm onClose={() => setCreate(false)} onSaved={() => done('Fixture created.')} />}
      {appoint && <Appointments fixture={appoint} onClose={() => setAppoint(null)} onSaved={() => done('Officials updated.')} />}
    </>
  );
}

function FixtureForm({ fixture, onClose, onSaved }) {
  const { season, activeDivisions, activeTeams, venues } = useLeague();
  const confirm = useConfirm();
  const isNew = !fixture;
  const [conflicts, setConflicts] = useState([]);
  const f = useForm({ divisionId: fixture?.divisionId || activeDivisions[0]?.id, homeId: fixture?.resolved?.homeId || '', awayId: fixture?.resolved?.awayId || '', date: fixture?.date || todayISO(), time: fixture?.time || '15:00', venueId: fixture?.venueId || venues[0]?.id, status: fixture?.status || 'scheduled', notes: fixture?.notes || '', announce: false }, async (v) => {
    setConflicts([]);
    try {
      const body = isNew ? { ...v, round: 1 } : { date: v.date, time: v.time, venueId: v.venueId, status: v.status, notes: v.notes, announce: v.announce };
      const res = await writeWithOverride(isNew ? '/league/admin/fixtures' : `/league/admin/fixtures/${fixture.id}`, { method: isNew ? 'POST' : 'PATCH', body }, confirm);
      if (res) onSaved();
    } catch (e) { setConflicts(conflictsOf(e)); throw e; }
  });
  const e = f.errors, teams = activeTeams.filter((t) => t.divisionId === f.values.divisionId && t.regStatus === 'approved');
  return (
    <Modal open onClose={onClose} size="lg" title={isNew ? 'Add fixture' : 'Edit fixture'} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={f.submitting} onClick={f.submit}>Save fixture</Button></>}>
      {conflicts.map((c, i) => <div key={i} className={`conflict conflict--${c.level}`}><strong>{c.level === 'block' ? 'Blocked: ' : 'Warning: '}</strong>{c.msg}</div>)}
      <form onSubmit={f.submit} noValidate><FormGrid>
        {isNew && <><Select label="Division" options={activeDivisions.map((d) => ({ value: d.id, label: d.name }))} {...f.bind('divisionId')} error={e.divisionId} /><span />
          <Select label="Home team" placeholder="Choose" options={teams.map((t) => ({ value: t.id, label: t.name }))} {...f.bind('homeId')} error={e.homeId} /><Select label="Away team" placeholder="Choose" options={teams.map((t) => ({ value: t.id, label: t.name }))} {...f.bind('awayId')} error={e.awayId} /></>}
        <Input label="Date" type="date" required {...f.bind('date')} error={e.date} /><Input label="Kick-off" type="time" required {...f.bind('time')} error={e.time} />
        <Select label="Venue" options={venues.map((v) => ({ value: v.id, label: v.name }))} {...f.bind('venueId')} error={e.venueId} /><Select label="Status" options={Object.entries(STATUS).filter(([k]) => k !== 'completed' || fixture?.result).map(([value, [label]]) => ({ value, label }))} {...f.bind('status')} error={e.status} />
        <Input label="Public note" full optional {...f.bind('notes')} error={e.notes} />{!isNew && <Checkbox label="Publish an announcement about this change" {...f.bindCheck('announce')} />}</FormGrid>
        <FormError error={f.formError && !conflicts.length ? f.formError : null} /></form>
    </Modal>
  );
}

function Appointments({ fixture, onClose, onSaved }) {
  const officials = useQuery(api, '/league/officials');
  const { team } = useLeague();
  const confirm = useConfirm();
  const [picks, setPicks] = useState(Object.fromEntries(Object.keys(ROLE).map((k) => [k, fixture.officials?.[k]?.id || ''])));
  const f = useForm({}, async () => { const r = await writeWithOverride(`/league/admin/fixtures/${fixture.id}/appointments`, { method: 'PUT', body: { picks } }, confirm); if (r) onSaved(); });
  const opts = (officials.data || []).filter((o) => o.status === 'approved').map((o) => ({ value: o.id, label: `${o.first} ${o.last}${o.availability === 'unavailable' ? ' (unavailable)' : ''}` }));
  return (
    <Modal open onClose={onClose} title="Appoint officials" eyebrow={matchTitle(fixture, team)} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={f.submitting} onClick={f.submit}>Save appointments</Button></>}>
      <FormError error={f.formError} />
      <FormGrid>{Object.entries(ROLE).map(([k, l]) => <Select key={k} label={l} placeholder="Not appointed" options={opts} value={picks[k]} onChange={(e) => setPicks({ ...picks, [k]: e.target.value })} />)}</FormGrid>
    </Modal>
  );
}

/* ---- generator: preview only, saved as a draft, never touches live fixtures ---- */
function Generator() {
  const { activeDivisions, activeTeams, venues } = useLeague();
  const toast = useToast();
  const [sel, setSel] = useState({ teams: [], venues: [venues[0]?.id].filter(Boolean) });
  const [preview, setPreview] = useState(null);
  const [div, setDiv] = useState(activeDivisions[0]?.id);
  const f = useForm({ name: '', format: 'single', slots: '14:00, 16:30', start: todayISO(), gap: 7 }, async (v) => {
    const res = await api('/league/admin/fixtures/generate', { method: 'POST', body: { ...v, gap: Number(v.gap), teams: sel.teams, venues: sel.venues, slots: v.slots.split(',').map((s) => s.trim()).filter(Boolean) } });
    setPreview(res);
  });
  const teams = activeTeams.filter((t) => t.divisionId === div && t.regStatus === 'approved');
  const toggle = (key, id) => setSel((s) => ({ ...s, [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id] }));
  const save = async () => { await api('/league/admin/drafts', { method: 'POST', body: { name: preview.name, format: preview.format, rows: preview.rows, conflicts: preview.conflicts } }); toast('Draft saved. Live fixtures were not changed.'); setPreview(null); };
  const e = f.errors;
  return (
    <>
      <p className="muted">Build a proposed schedule and review it before saving. Drafts never change live fixtures.</p>
      <form onSubmit={f.submit} noValidate>
        <FormGrid>
          <Input label="Draft name" required {...f.bind('name')} error={e.name} />
          <Select label="Format" options={[{ value: 'single', label: 'Single round-robin' }, { value: 'double', label: 'Double round-robin' }, { value: 'groups', label: 'Two groups' }, { value: 'knockout', label: 'Knockout' }]} {...f.bind('format')} error={e.format} />
          <Input label="Start date" type="date" {...f.bind('start')} error={e.start} /><Input label="Days between rounds" type="number" min="1" max="28" {...f.bind('gap')} error={e.gap} />
          <Input label="Kick-off slots" full hint="Comma separated, e.g. 14:00, 16:30" {...f.bind('slots')} error={e.slots} />
        </FormGrid>
        <Select label="Division to draw teams from" value={div} onChange={(ev) => { setDiv(ev.target.value); setSel((s) => ({ ...s, teams: [] })); }} options={activeDivisions.map((d) => ({ value: d.id, label: d.name }))} />
        <fieldset style={{ border: 0, padding: 0, margin: '14px 0' }}><legend className="field__label">Teams ({sel.teams.length} selected)</legend><div className="picker">{teams.map((t) => <label key={t.id} className="check"><input type="checkbox" checked={sel.teams.includes(t.id)} onChange={() => toggle('teams', t.id)} /><span>{t.name}</span></label>)}</div></fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: '14px 0' }}><legend className="field__label">Venues</legend><div className="picker">{venues.map((v) => <label key={v.id} className="check"><input type="checkbox" checked={sel.venues.includes(v.id)} onChange={() => toggle('venues', v.id)} /><span>{v.name}</span></label>)}</div></fieldset>
        <FormError error={f.formError && !Object.keys(e).length ? f.formError : null} /><Button type="submit" loading={f.submitting}>Preview schedule</Button>
      </form>
      {preview && <div style={{ marginTop: 28 }}>
        <h3>{preview.name}: {preview.rows.length} matches</h3>
        {preview.conflicts > 0 && <div className="notice notice--warn">{preview.conflicts} matches have no venue or slot available. Add venues or slots, or spread rounds across more days.</div>}
        <DataTable caption="Preview" rows={preview.rows.map((r, i) => ({ ...r, id: i }))} columns={[{ key: 'round', header: 'Round' }, { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) }, { key: 'time', header: 'Time', render: (r) => r.time || '—' }, { key: 'm', header: 'Match', render: (r) => `${r.home} v ${r.away}`, sortable: false }, { key: 'venue', header: 'Venue', render: (r) => (r.conflict ? <Pill tone="bad">No slot</Pill> : r.venue) }]} />
        <div className="btn-row" style={{ marginTop: 16 }}><Button onClick={save}>Save as draft</Button><Button variant="ghost" onClick={() => setPreview(null)}>Discard</Button></div>
      </div>}
    </>
  );
}

function Drafts() {
  const query = useQuery(api, '/league/admin/drafts');
  const confirm = useConfirm(), toast = useToast();
  const remove = async (d) => { if (!(await confirm({ title: 'Delete draft?', message: d.name, confirmLabel: 'Delete', danger: true }))) return; await api(`/league/admin/drafts/${d.id}`, { method: 'DELETE' }); toast('Draft deleted.'); query.reload(); };
  return <Async query={query} skeleton={<Skeleton lines={4} />}>{(rows) => <DataTable caption="Drafts" rows={rows} empty="No saved drafts." columns={[{ key: 'name', header: 'Name' }, { key: 'format', header: 'Format' }, { key: 'rows', header: 'Matches', numeric: true, render: (d) => d.rows.length }, { key: 'conflicts', header: 'Unplaced', numeric: true, render: (d) => d.conflicts || 0 }, { key: 'act', header: '', sortable: false, render: (d) => <Button size="sm" variant="ghost" onClick={() => remove(d)}>Delete</Button> }]} />}</Async>;
}

/* ---- results review ---- */
export function ResultsAdmin({ onChange }) {
  const { season, team } = useLeague();
  const query = useQuery(api, '/league/fixtures', { seasonId: season.id, when: 'results' });
  const confirm = useConfirm(), toast = useToast();
  const [enter, setEnter] = useState(null);
  const run = async (fn, msg) => { try { const r = await fn(); if (r !== undefined) { toast(msg); query.reload(); onChange?.(); } } catch (e) { toast(e.message, 'bad'); } };
  const approve = (f) => run(() => writeWithOverride(`/league/admin/fixtures/${f.id}/approve`, { method: 'POST' }, confirm), 'Result approved.');
  const dispute = async (f) => { if (await confirm({ title: 'Mark as disputed?', message: 'The result is removed from tables until it is resolved.', confirmLabel: 'Mark disputed' })) run(() => api(`/league/admin/fixtures/${f.id}/dispute`, { method: 'POST' }), 'Marked disputed.'); };
  return (
    <Async query={query} skeleton={<Skeleton lines={6} height={34} />}>{(rows) => {
      const review = rows.filter((f) => ['awaiting', 'review'].includes(f.status)), missing = rows.filter((f) => f.status === 'scheduled' && f.resolved.homeId && f.resolved.awayId && f.date <= todayISO());
      return (
        <>
          <h3 style={{ marginBottom: 10 }}>Awaiting approval ({review.length})</h3>
          <DataTable caption="Results to review" rows={review} empty="Nothing waiting for review." columns={[{ key: 'date', header: 'Date', render: (f) => fmtDate(f.date) }, { key: 'm', header: 'Match', render: (f) => matchTitle(f, team), sortable: false }, { key: 'r', header: 'Result', render: (f) => `${f.result.h}–${f.result.a}`, sortable: false }, { key: 's', header: 'Status', render: (f) => <StatusPill status={f.status} /> },
            { key: 'act', header: '', sortable: false, render: (f) => <span className="row"><Button size="sm" onClick={() => approve(f)} disabled={f.status === 'review'}>Approve</Button><Button size="sm" variant="ghost" onClick={() => dispute(f)}>Dispute</Button><Button size="sm" variant="ghost" onClick={() => setEnter(f)}>Correct score</Button></span> }]} />
          <h3 style={{ margin: '32px 0 10px' }}>Played but no result ({missing.length})</h3>
          <DataTable caption="Missing results" rows={missing} empty="All played matches have results." columns={[{ key: 'date', header: 'Date', render: (f) => fmtDate(f.date) }, { key: 'm', header: 'Match', render: (f) => matchTitle(f, team), sortable: false }, { key: 'act', header: '', sortable: false, render: (f) => <Button size="sm" variant="ghost" onClick={() => setEnter(f)}>Enter result</Button> }]} />
          {enter && <ScoreForm fixture={enter} onClose={() => setEnter(null)} onSaved={() => { setEnter(null); query.reload(); onChange?.(); toast('Saved.'); }} />}
        </>
      );
    }}</Async>
  );
}
function ScoreForm({ fixture, onClose, onSaved }) {
  const { team } = useLeague();
  const correcting = !!fixture.result;
  const f = useForm({ h: fixture.result?.h ?? 0, a: fixture.result?.a ?? 0, reason: '' }, async (v) => {
    await api(`/league/admin/fixtures/${fixture.id}/${correcting ? 'score' : 'result'}`, { method: correcting ? 'PATCH' : 'POST', body: { h: Number(v.h), a: Number(v.a), ...(correcting ? { reason: v.reason } : {}) } }); onSaved();
  });
  const e = f.errors;
  return (
    <Modal open onClose={onClose} size="sm" title={correcting ? 'Correct score' : 'Enter result'} eyebrow={matchTitle(fixture, team)} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={f.submitting} onClick={f.submit}>Save</Button></>}>
      <form onSubmit={f.submit} noValidate><FormGrid><Input label="Home" type="number" min="0" {...f.bind('h')} error={e.h} /><Input label="Away" type="number" min="0" {...f.bind('a')} error={e.a} />{correcting && <Textarea label="Reason for correction" {...f.bind('reason')} error={e.reason} />}</FormGrid><FormError error={f.formError && !Object.keys(e).length ? f.formError : null} /></form>
    </Modal>
  );
}

/* ---- officials ---- */
export function OfficialsAdmin({ onChange }) {
  const query = useQuery(api, '/league/officials');
  const toast = useToast();
  const act = async (o, what) => { try { await api(`/league/admin/officials/${o.id}/${what}`, { method: 'POST' }); toast('Updated.'); query.reload(); onChange?.(); } catch (e) { toast(e.message, 'bad'); } };
  return <Async query={query} skeleton={<Skeleton lines={6} />}>{(rows) => <DataTable caption="Officials" rows={rows} columns={[{ key: 'last', header: 'Name', render: (o) => `${o.first} ${o.last}` }, { key: 'roles', header: 'Roles', render: (o) => o.roles.join(', '), sortable: false }, { key: 'status', header: 'Registration', render: (o) => <Pill tone={o.status === 'approved' ? 'ok' : 'warn'}>{o.status}</Pill> }, { key: 'verified', header: 'Qualification', render: (o) => <Pill tone={o.verified ? 'ok' : 'neutral'}>{o.verified ? 'Verified' : 'Declared'}</Pill> },
    { key: 'act', header: '', sortable: false, render: (o) => <span className="row">{o.status !== 'approved' && <Button size="sm" onClick={() => act(o, 'approve')}>Approve</Button>}<Button size="sm" variant="ghost" onClick={() => act(o, 'verify')}>{o.verified ? 'Remove verification' : 'Verify'}</Button></span> }]} />}</Async>;
}
