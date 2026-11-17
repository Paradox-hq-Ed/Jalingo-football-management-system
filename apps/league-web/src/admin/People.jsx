import { useState } from 'react';
import { Async, Button, Checkbox, DataTable, FormError, FormGrid, Input, Modal, Pill, Select, Skeleton, Tabs, TabPanel, Textarea, fmtDate, useConfirm, useForm, useQuery, useQueryParams, useToast } from '@jalingo/shared';
import { api } from '../api.js';
import { useLeague } from '../data.jsx';
import { writeWithOverride } from './helpers.js';

const TONE = { approved: 'ok', pending: 'warn', submitted: 'warn', 'under-review': 'info', corrections: 'warn', rejected: 'bad', withdrawn: 'neutral', archived: 'neutral', resolved: 'ok', upheld: 'bad', closed: 'neutral', 'awaiting-response': 'warn' };

/* ---- teams ---- */
export function TeamsAdmin({ onChange }) {
  const { activeTeams, division, reload } = useLeague();
  const apps = useQuery(api, '/league/admin/applications');
  const [q, setQ] = useQueryParams();
  const tab = q.get('tab') || 'applications';
  const [dec, setDec] = useState(null);
  const confirm = useConfirm(), toast = useToast();
  const toggle = async (t) => { const w = t.regStatus !== 'withdrawn'; if (!(await confirm({ title: w ? 'Withdraw team?' : 'Reinstate team?', message: w ? `${t.name} will be removed from tables until reinstated.` : `${t.name} will return to the competition.`, confirmLabel: w ? 'Withdraw' : 'Reinstate', danger: w }))) return; try { await api(`/league/admin/teams/${t.id}/${w ? 'withdraw' : 'reinstate'}`, { method: 'POST' }); toast('Updated.'); reload(); } catch (e) { toast(e.message, 'bad'); } };
  return (
    <>
      <Tabs value={tab} onChange={(t) => setQ({ tab: t })} label="Teams" tabs={[{ key: 'applications', label: 'Applications' }, { key: 'teams', label: 'Registered teams' }]} />
      <TabPanel id="applications" active={tab === 'applications'}><Async query={apps} skeleton={<Skeleton lines={4} />}>{(rows) => <DataTable caption="Applications" rows={rows} empty="No applications." columns={[{ key: 'name', header: 'Club' }, { key: 'divisionId', header: 'Division', render: (a) => division(a.divisionId)?.short }, { key: 'rep', header: 'Representative' }, { key: 'submitted', header: 'Submitted', render: (a) => fmtDate(a.submitted) }, { key: 'docs', header: 'Documents', sortable: false, render: (a) => `${a.docs.filter((d) => d.ok).length}/${a.docs.length}` }, { key: 'status', header: 'Status', render: (a) => <Pill tone={TONE[a.status]}>{a.status}</Pill> }, { key: 'act', header: '', sortable: false, render: (a) => <Button size="sm" variant="ghost" onClick={() => setDec(a)}>Review</Button> }]} />}</Async></TabPanel>
      <TabPanel id="teams" active={tab === 'teams'}><DataTable caption="Teams" rows={activeTeams} columns={[{ key: 'name', header: 'Team' }, { key: 'divisionId', header: 'Division', render: (t) => division(t.divisionId)?.short }, { key: 'regStatus', header: 'Status', render: (t) => <Pill tone={TONE[t.regStatus]}>{t.regStatus}</Pill> }, { key: 'act', header: '', sortable: false, render: (t) => <Button size="sm" variant="ghost" onClick={() => toggle(t)}>{t.regStatus === 'withdrawn' ? 'Reinstate' : 'Withdraw'}</Button> }]} /></TabPanel>
      {dec && <ApplicationDecision app={dec} onClose={() => setDec(null)} onSaved={() => { setDec(null); apps.reload(); onChange?.(); toast('Decision recorded.'); }} />}
    </>
  );
}
function ApplicationDecision({ app, onClose, onSaved }) {
  const f = useForm({ status: app.status === 'submitted' ? 'under-review' : app.status, note: '' }, async (v) => { await api(`/league/admin/applications/${app.id}/decision`, { method: 'POST', body: v }); onSaved(); });
  const e = f.errors;
  return (
    <Modal open onClose={onClose} title={app.name} eyebrow="Team application" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={f.submitting} onClick={f.submit}>Record decision</Button></>}>
      <ul style={{ paddingLeft: 18 }}>{app.docs.map((d) => <li key={d.k}>{d.ok ? '✓' : '✗'} {d.k}</li>)}</ul>
      <h3 style={{ margin: '14px 0 6px' }}>History</h3><ul className="muted small" style={{ paddingLeft: 18 }}>{app.history.map((h, i) => <li key={i}>{fmtDate(h.at)} · {h.status}: {h.note}</li>)}</ul>
      <form onSubmit={f.submit} noValidate style={{ marginTop: 16 }}><FormGrid><Select label="New status" full options={['under-review', 'corrections', 'approved', 'rejected', 'withdrawn', 'archived']} {...f.bind('status')} error={e.status} /><Textarea label="Decision note" {...f.bind('note')} error={e.note} /></FormGrid><FormError error={f.formError && !Object.keys(e).length ? f.formError : null} /></form>
    </Modal>
  );
}

/* ---- players: registrations + transfers ---- */
export function PlayersAdmin({ onChange }) {
  const regs = useQuery(api, '/league/admin/registrations', { status: 'pending' });
  const transfers = useQuery(api, '/league/admin/transfers');
  const { team } = useLeague();
  const [q, setQ] = useQueryParams();
  const tab = q.get('tab') || 'registrations';
  const confirm = useConfirm(), toast = useToast();
  const decide = async (kind, id, to, reload) => { try { const r = await writeWithOverride(`/league/admin/${kind}/${id}/decision`, { method: 'POST', body: { to } }, confirm); if (r) { toast(`Marked ${to}.`); reload(); onChange?.(); } } catch (e) { toast(e.message, 'bad'); } };
  return (
    <>
      <Tabs value={tab} onChange={(t) => setQ({ tab: t })} label="Players" tabs={[{ key: 'registrations', label: 'Registrations', badge: regs.data?.length }, { key: 'transfers', label: 'Transfers', badge: transfers.data?.filter((t) => t.status === 'pending').length }]} />
      <TabPanel id="registrations" active={tab === 'registrations'}><Async query={regs} skeleton={<Skeleton lines={4} />}>{(rows) => <DataTable caption="Pending registrations" rows={rows} empty="No pending registrations." columns={[{ key: 'p', header: 'Player', render: (r) => `${r.player.first} ${r.player.last}`, sortable: false }, { key: 'teamId', header: 'Team', render: (r) => team(r.teamId)?.name }, { key: 'number', header: 'No.', numeric: true }, { key: 'submitted', header: 'Submitted', render: (r) => fmtDate(r.submitted) }, { key: 'act', header: '', sortable: false, render: (r) => <span className="row"><Button size="sm" onClick={() => decide('registrations', r.id, 'approved', regs.reload)}>Approve</Button><Button size="sm" variant="ghost" onClick={() => decide('registrations', r.id, 'rejected', regs.reload)}>Reject</Button></span> }]} />}</Async></TabPanel>
      <TabPanel id="transfers" active={tab === 'transfers'}><Async query={transfers} skeleton={<Skeleton lines={4} />}>{(rows) => <DataTable caption="Transfers" rows={rows} empty="No transfer requests." columns={[{ key: 'playerId', header: 'Player' }, { key: 'fromTeam', header: 'From', render: (t) => team(t.fromTeam)?.name }, { key: 'toTeam', header: 'To', render: (t) => team(t.toTeam)?.name }, { key: 'status', header: 'Status', render: (t) => <Pill tone={TONE[t.status]}>{t.status}</Pill> }, { key: 'act', header: '', sortable: false, render: (t) => t.status === 'pending' && <span className="row"><Button size="sm" onClick={() => decide('transfers', t.id, 'approved', transfers.reload)}>Approve</Button><Button size="sm" variant="ghost" onClick={() => decide('transfers', t.id, 'rejected', transfers.reload)}>Reject</Button></span> }]} />}</Async></TabPanel>
    </>
  );
}

/* ---- discipline ---- */
const STATUSES = ['submitted', 'under-review', 'awaiting-response', 'upheld', 'rejected', 'resolved', 'closed'];
export function DisciplineAdmin({ onChange }) {
  const query = useQuery(api, '/league/discipline');
  const { team } = useLeague();
  const [open, setOpen] = useState(null), [create, setCreate] = useState(false);
  const toast = useToast();
  const saved = (m) => { setOpen(null); setCreate(false); query.reload(); onChange?.(); toast(m); };
  return (
    <>
      <div className="row row--between" style={{ marginBottom: 14 }}><p className="muted" style={{ margin: 0 }}>Internal notes are never shown publicly. A case is published only when marked public.</p><Button onClick={() => setCreate(true)}>Open a case</Button></div>
      <Async query={query} skeleton={<Skeleton lines={5} />}>{(rows) => <DataTable caption="Cases" rows={rows} initialSort={{ key: 'date', dir: 'desc' }} empty="No cases." columns={[{ key: 'id', header: 'Case' }, { key: 'type', header: 'Type' }, { key: 'category', header: 'Category' }, { key: 'teamId', header: 'Team', render: (c) => team(c.teamId)?.name || '—' }, { key: 'date', header: 'Opened', render: (c) => fmtDate(c.date) }, { key: 'status', header: 'Status', render: (c) => <Pill tone={TONE[c.status]}>{c.status}</Pill> }, { key: 'public', header: 'Public', render: (c) => (c.public ? 'Yes' : 'No') }, { key: 'act', header: '', sortable: false, render: (c) => <Button size="sm" variant="ghost" onClick={() => setOpen(c)}>Open</Button> }]} />}</Async>
      {open && <CaseUpdate c={open} onClose={() => setOpen(null)} onSaved={() => saved('Case updated.')} />}
      {create && <CaseCreate onClose={() => setCreate(false)} onSaved={() => saved('Case opened.')} />}
    </>
  );
}
function CaseUpdate({ c, onClose, onSaved }) {
  const f = useForm({ status: c.status, decision: c.decision || '', public: c.public, note: '' }, async (v) => { await api(`/league/admin/discipline/${c.id}`, { method: 'PATCH', body: v }); onSaved(); });
  const e = f.errors;
  return (
    <Modal open onClose={onClose} size="lg" title={`${c.id}: ${c.category}`} eyebrow={c.type} footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button loading={f.submitting} onClick={f.submit}>Save update</Button></>}>
      <h3 style={{ marginBottom: 6 }}>History</h3><ul className="small" style={{ paddingLeft: 18 }}>{c.history.map((h, i) => <li key={i}>{fmtDate(h.at)} · <strong>{h.by}</strong> · {h.status}{h.internal ? ' (internal)' : ''}: {h.note}</li>)}</ul>
      <form onSubmit={f.submit} noValidate style={{ marginTop: 16 }}><FormGrid><Select label="Status" options={STATUSES} {...f.bind('status')} error={e.status} /><Input label="Decision (shown if public)" {...f.bind('decision')} error={e.decision} /><Textarea label="Note" {...f.bind('note')} error={e.note} /><Checkbox label="Publish this case and decision" {...f.bindCheck('public')} /></FormGrid><FormError error={f.formError && !Object.keys(e).length ? f.formError : null} /></form>
    </Modal>
  );
}
function CaseCreate({ onClose, onSaved }) {
  const { activeTeams } = useLeague();
  const f = useForm({ type: 'Misconduct', category: '', teamId: '', note: '' }, async (v) => { await api('/league/admin/discipline', { method: 'POST', body: v }); onSaved(); });
  const e = f.errors;
  return (
    <Modal open onClose={onClose} title="Open a case" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={f.submitting} onClick={f.submit}>Open case</Button></>}>
      <form onSubmit={f.submit} noValidate><FormGrid><Select label="Type" options={['Misconduct', 'Suspension', 'Team sanction', 'Match incident', 'Protest', 'Appeal']} {...f.bind('type')} error={e.type} /><Input label="Category" {...f.bind('category')} error={e.category} /><Select label="Team" optional placeholder="None" options={activeTeams.map((t) => ({ value: t.id, label: t.name }))} {...f.bind('teamId')} /><Textarea label="Details" {...f.bind('note')} error={e.note} /></FormGrid><FormError error={f.formError && !Object.keys(e).length ? f.formError : null} /></form>
    </Modal>
  );
}
