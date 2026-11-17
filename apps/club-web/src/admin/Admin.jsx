import { useState } from 'react';
import { Async, Button, Checkbox, DataTable, FormError, FormGrid, Input, Modal, Pill, RequireAuth, Select, Skeleton, Tabs, TabPanel, Textarea, fmtDate, fmtDateTime, useAuth, useConfirm, useDocumentTitle, useForm, useQuery, useQueryParams, useToast, todayISO } from '@jalingo/shared';
import { api } from '../api.js';
import { useClub } from '../data.jsx';

export default function Admin() {
  useDocumentTitle('Staff area · Eland FC');
  return (
    <div className="admin"><div className="wrap">
      <RequireAuth roles={['club_admin']} loginTitle="Club staff sign-in" loginNote="For authorised Eland FC staff only."><Dashboard /></RequireAuth>
    </div></div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const [q, setQ] = useQueryParams();
  const tab = q.get('tab') || 'enquiries';
  const enquiries = useQuery(api, '/club/admin/enquiries');
  const unread = (enquiries.data || []).filter((e) => e.status === 'new').length;
  return (
    <>
      <div className="row row--between"><h1 className="view-heading" tabIndex={-1}>Staff area</h1><div className="row"><span className="muted small">{user.name}</span><Button variant="ghost" size="sm" onClick={logout}>Sign out</Button></div></div>
      <Tabs value={tab} onChange={(t) => setQ({ tab: t })} label="Staff area" tabs={[{ key: 'enquiries', label: 'Enquiries', badge: unread }, { key: 'matches', label: 'Matches' }, { key: 'news', label: 'News' }, { key: 'players', label: 'Players' }]} />
      <TabPanel id="enquiries" active={tab === 'enquiries'}><Enquiries query={enquiries} /></TabPanel>
      <TabPanel id="matches" active={tab === 'matches'}><Matches /></TabPanel>
      <TabPanel id="news" active={tab === 'news'}><NewsAdmin /></TabPanel>
      <TabPanel id="players" active={tab === 'players'}><Players /></TabPanel>
    </>
  );
}

const TYPE_LABEL = { general: 'General', trials: 'Trial', sponsorship: 'Partnership', media: 'Media' };
function Enquiries({ query }) {
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const setStatus = async (e, status) => { try { await api(`/club/admin/enquiries/${e.id}`, { method: 'PATCH', body: { status } }); query.reload(); setOpen((o) => o && { ...o, status }); } catch (err) { toast(err.message, 'bad'); } };
  const tone = { new: 'warn', read: 'info', replied: 'ok', archived: 'neutral' };
  return (
    <Async query={query} skeleton={<Skeleton lines={5} />}>{(rows) => (
      <>
        <DataTable caption="Enquiries" rows={rows} empty="No enquiries yet." onRowClick={(e) => { setOpen(e); if (e.status === 'new') setStatus(e, 'read'); }} initialSort={{ key: 'at', dir: 'desc' }} columns={[
          { key: 'at', header: 'Received', render: (e) => fmtDateTime(e.at), sortValue: (e) => e.at }, { key: 'name', header: 'From' }, { key: 'type', header: 'Type', render: (e) => TYPE_LABEL[e.type] },
          { key: 'message', header: 'Message', render: (e) => <span className="muted">{e.message.slice(0, 70)}{e.message.length > 70 ? '…' : ''}</span>, sortable: false }, { key: 'status', header: 'Status', render: (e) => <Pill tone={tone[e.status]}>{e.status}</Pill> }]} />
        <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name || ''} eyebrow={open && `${TYPE_LABEL[open.type]} enquiry · ${fmtDateTime(open.at)}`} footer={open && <>{['replied', 'archived'].map((s) => <Button key={s} variant="ghost" disabled={open.status === s} onClick={() => setStatus(open, s)}>Mark {s}</Button>)}<a className="btn btn--primary" href={`mailto:${open.email}?subject=Re: your enquiry to Eland FC`}>Reply by email</a></>}>
          {open && <><dl className="kv"><dt>Email</dt><dd>{open.email}</dd>{open.phone && <><dt>Phone</dt><dd>{open.phone}</dd></>}{['age', 'position', 'experience', 'organisation', 'interest', 'outlet', 'deadline'].filter((k) => open[k]).map((k) => <><dt key={`${k}-t`} style={{ textTransform: 'capitalize' }}>{k}</dt><dd key={k}>{open[k]}</dd></>)}</dl><p style={{ marginTop: 18, whiteSpace: 'pre-wrap' }}>{open.message}</p></>}
        </Modal>
      </>
    )}</Async>
  );
}

function Matches() {
  const toast = useToast(), confirm = useConfirm();
  const query = useQuery(api, '/club/matches');
  const [edit, setEdit] = useState(null);
  const remove = async (m) => { if (!(await confirm({ title: 'Delete match?', message: `${m.opponent} on ${fmtDate(m.date)} will be removed from the site.`, confirmLabel: 'Delete', danger: true }))) return; try { await api(`/club/admin/matches/${m.id}`, { method: 'DELETE' }); toast('Match deleted.'); query.reload(); } catch (e) { toast(e.message, 'bad'); } };
  return (
    <>
      <div className="row row--between" style={{ marginBottom: 16 }}><p className="muted" style={{ margin: 0 }}>Enter the score after full time to turn a fixture into a result.</p><Button onClick={() => setEdit({})}>Add match</Button></div>
      <Async query={query} skeleton={<Skeleton lines={5} />}>{(rows) => <DataTable caption="Matches" rows={rows} initialSort={{ key: 'date', dir: 'desc' }} columns={[
        { key: 'date', header: 'Date', render: (m) => `${fmtDate(m.date)} · ${m.time}`, sortValue: (m) => m.date + m.time }, { key: 'opponent', header: 'Opponent', render: (m) => `${m.home ? 'v' : '@'} ${m.opponent}` }, { key: 'competition', header: 'Competition' },
        { key: 'score', header: 'Score', render: (m) => (m.score ? m.score.join('–') : '—'), sortable: false }, { key: 'status', header: 'Status', render: (m) => <Pill tone={{ win: 'ok', loss: 'bad', draw: 'neutral', upcoming: 'info', postponed: 'warn' }[m.status]}>{m.status}</Pill> },
        { key: 'act', header: '', sortable: false, render: (m) => <span className="row"><Button size="sm" variant="ghost" onClick={() => setEdit(m)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => remove(m)}>Delete</Button></span> }]} />}</Async>
      {edit && <MatchForm match={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); query.reload(); toast('Match saved.'); }} />}
    </>
  );
}
function MatchForm({ match, onClose, onSaved }) {
  const isNew = !match.id;
  const f = useForm({ date: match.date || todayISO(), time: match.time || '16:00', home: match.home ?? true, opponent: match.opponent || '', competition: match.competition || 'Friendly', venue: match.venue || '', us: match.score?.[0] ?? '', them: match.score?.[1] ?? '', postponed: !!match.postponed }, async (v) => {
    const body = { date: v.date, time: v.time, home: v.home, opponent: v.opponent, competition: v.competition, venue: v.venue, postponed: v.postponed };
    if (v.us !== '' && v.them !== '') body.score = [Number(v.us), Number(v.them)];
    await api(isNew ? '/club/admin/matches' : `/club/admin/matches/${match.id}`, { method: isNew ? 'POST' : 'PATCH', body });
    onSaved();
  });
  const e = f.errors;
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add match' : `Edit: ${match.opponent}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={f.submitting} onClick={f.submit}>Save match</Button></>}>
      <form onSubmit={f.submit} noValidate><FormGrid>
        <Input label="Date" type="date" required {...f.bind('date')} error={e.date} /><Input label="Kick-off" type="time" required {...f.bind('time')} error={e.time} />
        <Input label="Opponent" required {...f.bind('opponent')} error={e.opponent} /><Input label="Competition" {...f.bind('competition')} error={e.competition} />
        <Input label="Venue" {...f.bind('venue')} error={e.venue} /><Select label="Home or away" value={f.values.home ? 'home' : 'away'} onChange={(ev) => f.set('home', ev.target.value === 'home')} options={[{ value: 'home', label: 'Home' }, { value: 'away', label: 'Away' }]} />
        <Input label="Eland FC goals" type="number" min="0" optional {...f.bind('us')} /><Input label="Opponent goals" type="number" min="0" optional {...f.bind('them')} />
        <Checkbox label="Postponed" {...f.bindCheck('postponed')} /></FormGrid><FormError error={f.formError} /></form>
    </Modal>
  );
}

function NewsAdmin() {
  const toast = useToast(), confirm = useConfirm(), { categories } = { categories: ['Matches', 'Club', 'Community', 'Squad', 'Video'] };
  const query = useQuery(api, '/club/news');
  const [edit, setEdit] = useState(null);
  const toggle = async (s) => { try { await api(`/club/admin/news/${s.id}`, { method: 'PATCH', body: { status: s.status === 'published' ? 'draft' : 'published' } }); query.reload(); } catch (e) { toast(e.message, 'bad'); } };
  const remove = async (s) => { if (!(await confirm({ title: 'Delete story?', message: s.title, confirmLabel: 'Delete', danger: true }))) return; await api(`/club/admin/news/${s.id}`, { method: 'DELETE' }); query.reload(); toast('Story deleted.'); };
  return (
    <>
      <div className="row row--between" style={{ marginBottom: 16 }}><p className="muted" style={{ margin: 0 }}>Drafts stay hidden from the public site.</p><Button onClick={() => setEdit({})}>New story</Button></div>
      <Async query={query} skeleton={<Skeleton lines={5} />}>{(rows) => <DataTable caption="Stories" rows={rows} columns={[
        { key: 'title', header: 'Title' }, { key: 'cat', header: 'Category' }, { key: 'date', header: 'Date', render: (s) => fmtDate(s.date) }, { key: 'status', header: 'Status', render: (s) => <Pill tone={s.status === 'published' ? 'ok' : 'warn'}>{s.status}</Pill> },
        { key: 'act', header: '', sortable: false, render: (s) => <span className="row"><Button size="sm" variant="ghost" onClick={() => setEdit(s)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => toggle(s)}>{s.status === 'published' ? 'Unpublish' : 'Publish'}</Button><Button size="sm" variant="ghost" onClick={() => remove(s)}>Delete</Button></span> }]} />}</Async>
      {edit && <StoryForm story={edit} cats={categories} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); query.reload(); toast('Story saved.'); }} />}
    </>
  );
}
function StoryForm({ story, cats, onClose, onSaved }) {
  const isNew = !story.id;
  const f = useForm({ cat: story.cat || 'Club', title: story.title || '', dek: story.dek || '', body: (story.body || []).join('\n\n'), status: story.status || 'draft' }, async (v) => {
    const body = { ...v, body: v.body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean) };
    await api(isNew ? '/club/admin/news' : `/club/admin/news/${story.id}`, { method: isNew ? 'POST' : 'PATCH', body });
    onSaved();
  });
  const e = f.errors;
  return (
    <Modal open onClose={onClose} size="lg" title={isNew ? 'New story' : 'Edit story'} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={f.submitting} onClick={f.submit}>Save story</Button></>}>
      <form onSubmit={f.submit} noValidate><FormGrid>
        <Input label="Title" full required {...f.bind('title')} error={e.title} /><Select label="Category" options={cats} {...f.bind('cat')} error={e.cat} /><Select label="Status" options={['draft', 'published']} {...f.bind('status')} error={e.status} />
        <Input label="Summary" full required {...f.bind('dek')} error={e.dek} /><Textarea label="Story" rows={10} hint="Separate paragraphs with a blank line." {...f.bind('body')} error={e.body} /></FormGrid><FormError error={f.formError} /></form>
    </Modal>
  );
}

function Players() {
  const toast = useToast(), { availability, positions } = useClub();
  const query = useQuery(api, '/club/players');
  const update = async (p, patch) => { try { await api(`/club/admin/players/${p.id}`, { method: 'PATCH', body: patch }); query.reload(); toast('Player updated.'); } catch (e) { toast(e.message, 'bad'); } };
  return (
    <Async query={query} skeleton={<Skeleton lines={6} />}>{(rows) => <DataTable caption="Players" rows={rows} columns={[
      { key: 'reg', header: 'Reg.' }, { key: 'squad', header: 'Squad' }, { key: 'num', header: 'No.', numeric: true }, { key: 'pos', header: 'Position', render: (p) => positions[p.pos] },
      { key: 'name', header: 'Name', render: (p) => <NameCell p={p} onSave={(name) => update(p, { name })} />, sortable: false },
      { key: 'availability', header: 'Availability', render: (p) => <select aria-label={`Availability for ${p.reg}`} className="input" style={{ minHeight: 34, padding: '4px 8px' }} value={p.availability} onChange={(e) => update(p, { availability: e.target.value })}>{Object.entries(availability).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select> }]} />}</Async>
  );
}
function NameCell({ p, onSave }) {
  const [v, setV] = useState(p.name || '');
  return <input className="input" aria-label={`Name for ${p.reg}`} style={{ minHeight: 34, padding: '4px 8px' }} placeholder="Name to be confirmed" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== (p.name || '') && onSave(v)} />;
}
