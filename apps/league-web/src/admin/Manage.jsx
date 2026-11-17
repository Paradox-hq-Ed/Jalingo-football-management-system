import { useState } from 'react';
import { Async, Button, Checkbox, DataTable, FormError, FormGrid, Input, Modal, Pill, Select, Skeleton, Tabs, TabPanel, Textarea, fmtDate, fmtDateTime, useConfirm, useForm, useQuery, useQueryParams, useToast } from '@jalingo/shared';
import { api } from '../api.js';
import { useLeague } from '../data.jsx';

/* ---- content: one generic manager for announcements, stories, documents and partners ---- */
const TYPES = {
  announcements: { label: 'Announcements', list: '/league/announcements', fields: [['title', 'Title', 'text'], ['cat', 'Category', 'text'], ['body', 'Message', 'area']], status: ['draft', 'published'], defaults: { cat: 'Notice', status: 'draft' }, cols: [['title', 'Title'], ['cat', 'Category']] },
  news: { label: 'Stories', list: '/league/news', fields: [['title', 'Title', 'text'], ['cat', 'Category', 'text'], ['dek', 'Summary', 'text'], ['body', 'Story (blank line between paragraphs)', 'area']], status: ['draft', 'published'], defaults: { cat: 'Competition news', status: 'draft' }, cols: [['title', 'Title'], ['cat', 'Category']] },
  documents: { label: 'Documents', list: '/league/documents', fields: [['title', 'Title', 'text'], ['cat', 'Category', 'text'], ['version', 'Version', 'text']], status: ['draft', 'published'], extra: { visibility: ['public', 'restricted'] }, defaults: { cat: 'Rules', version: '1.0', status: 'draft', visibility: 'public' }, cols: [['title', 'Title'], ['version', 'Version']] },
  sponsors: { label: 'Partners', list: '/league/bootstrap', pick: (b) => b.sponsors, fields: [['name', 'Name', 'text']], status: ['active', 'inactive'], extra: { tier: ['principal', 'official', 'community'] }, defaults: { tier: 'community', status: 'active', placements: [] }, cols: [['name', 'Name'], ['tier', 'Tier']] }
};
export function ContentAdmin() {
  const [q, setQ] = useQueryParams();
  const tab = q.get('tab') || 'announcements';
  return <><Tabs value={tab} onChange={(t) => setQ({ tab: t })} label="Content" tabs={Object.entries(TYPES).map(([key, t]) => ({ key, label: t.label }))} />{Object.keys(TYPES).map((k) => <TabPanel key={k} id={k} active={tab === k}><Manager kind={k} /></TabPanel>)}</>;
}
function Manager({ kind }) {
  const t = TYPES[kind];
  const raw = useQuery(api, t.list);
  const query = { ...raw, data: raw.data && (t.pick ? t.pick(raw.data) : raw.data) };
  const [edit, setEdit] = useState(null);
  const toast = useToast(), confirm = useConfirm();
  const flip = async (r) => { const [a, b] = t.status; try { await api(`/league/admin/${kind}/${r.id}`, { method: 'PATCH', body: { status: r.status === a ? b : a } }); raw.reload(); toast('Updated.'); } catch (e) { toast(e.message, 'bad'); } };
  const remove = async (r) => { if (!(await confirm({ title: 'Delete?', message: r.title || r.name, confirmLabel: 'Delete', danger: true }))) return; try { await api(`/league/admin/${kind}/${r.id}`, { method: 'DELETE' }); raw.reload(); toast('Deleted.'); } catch (e) { toast(e.message, 'bad'); } };
  return (
    <>
      <div className="row row--between" style={{ marginBottom: 14 }}><p className="muted" style={{ margin: 0 }}>Drafts and inactive items are hidden from the public site.</p><Button onClick={() => setEdit({})}>New</Button></div>
      <Async query={query} skeleton={<Skeleton lines={5} />}>{(rows) => <DataTable caption={t.label} rows={rows} empty="Nothing here yet." columns={[...t.cols.map(([key, header]) => ({ key, header })), { key: 'status', header: 'Status', render: (r) => <Pill tone={['published', 'active'].includes(r.status) ? 'ok' : 'warn'}>{r.status}</Pill> }, { key: 'act', header: '', sortable: false, render: (r) => <span className="row"><Button size="sm" variant="ghost" onClick={() => setEdit(r)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => flip(r)}>{['published', 'active'].includes(r.status) ? 'Unpublish' : 'Publish'}</Button><Button size="sm" variant="ghost" onClick={() => remove(r)}>Delete</Button></span> }]} />}</Async>
      {edit && <ContentForm kind={kind} t={t} rec={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); raw.reload(); toast('Saved.'); }} />}
    </>
  );
}
function ContentForm({ kind, t, rec, onClose, onSaved }) {
  const isNew = !rec.id;
  const init = { ...t.defaults, ...Object.fromEntries([...t.fields.map(([k]) => k), 'status', ...Object.keys(t.extra || {})].map((k) => [k, Array.isArray(rec[k]) ? rec[k].join('\n\n') : rec[k] ?? t.defaults[k] ?? ''])) };
  const f = useForm(init, async (v) => { const body = { ...v, ...(kind === 'news' ? { body: v.body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean) } : {}), ...(kind === 'sponsors' ? { placements: rec.placements || [] } : {}) }; await api(isNew ? `/league/admin/${kind}` : `/league/admin/${kind}/${rec.id}`, { method: isNew ? 'POST' : 'PATCH', body }); onSaved(); });
  const e = f.errors;
  return (
    <Modal open onClose={onClose} size="lg" title={isNew ? `New ${t.label.toLowerCase().replace(/s$/, '')}` : 'Edit'} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={f.submitting} onClick={f.submit}>Save</Button></>}>
      <form onSubmit={f.submit} noValidate><FormGrid>
        {t.fields.map(([k, l, type]) => type === 'area' ? <Textarea key={k} label={l} rows={8} {...f.bind(k)} error={e[k]} /> : <Input key={k} label={l} full={k === 'title' || k === 'dek'} {...f.bind(k)} error={e[k]} />)}
        {Object.entries(t.extra || {}).map(([k, opts]) => <Select key={k} label={k[0].toUpperCase() + k.slice(1)} options={opts} {...f.bind(k)} error={e[k]} />)}
        <Select label="Status" options={t.status} {...f.bind('status')} error={e.status} />
      </FormGrid><FormError error={f.formError && !Object.keys(e).length ? f.formError : null} /></form>
    </Modal>
  );
}

/* ---- settings ---- */
export function SettingsAdmin() {
  const { config, seasons, reload } = useLeague();
  const toast = useToast(), confirm = useConfirm();
  const f = useForm({ compName: config.compName, shortName: config.shortName, status: config.status, minRestDays: config.minRestDays, w: config.points.w, d: config.points.d, l: config.points.l, tiebreak: config.tiebreak }, async (v) => {
    await api('/league/admin/config', { method: 'PUT', body: { ...v, minRestDays: Number(v.minRestDays), w: Number(v.w), d: Number(v.d), l: Number(v.l) } }); reload(); toast('Settings saved.');
  });
  const s = useForm({ name: '', copy: true }, async (v) => { await api('/league/admin/seasons', { method: 'POST', body: v }); reload(); s.reset(); toast('Draft season created.'); });
  const TB = { gd: 'Goal difference', gf: 'Goals scored', wins: 'Wins', h2h: 'Head-to-head' };
  const toggle = (k) => f.set('tiebreak', f.values.tiebreak.includes(k) ? f.values.tiebreak.filter((x) => x !== k) : [...f.values.tiebreak, k]);
  const removeSeason = async (se) => { if (!(await confirm({ title: 'Delete draft season?', message: se.name, confirmLabel: 'Delete', danger: true }))) return; try { await api(`/league/admin/seasons/${se.id}`, { method: 'DELETE' }); reload(); toast('Deleted.'); } catch (e) { toast(e.message, 'bad'); } };
  const e = f.errors;
  return (
    <div className="stack" style={{ '--gap': '32px' }}>
      <form className="panel panel__body" onSubmit={f.submit} noValidate>
        <h3 style={{ marginBottom: 14 }}>Competition rules</h3>
        <FormGrid><Input label="Competition name" {...f.bind('compName')} error={e.compName} /><Input label="Short name" {...f.bind('shortName')} error={e.shortName} /><Input label="Status line" full {...f.bind('status')} error={e.status} />
          <Input label="Points for a win" type="number" min="0" {...f.bind('w')} error={e.w} /><Input label="Points for a draw" type="number" min="0" {...f.bind('d')} error={e.d} /><Input label="Points for a loss" type="number" min="0" {...f.bind('l')} error={e.l} /><Input label="Minimum rest days" type="number" min="0" {...f.bind('minRestDays')} error={e.minRestDays} /></FormGrid>
        <fieldset style={{ border: 0, padding: 0, margin: '8px 0 16px' }}><legend className="field__label">Tie-break rules (applied in this order)</legend><div className="row">{Object.entries(TB).map(([k, l]) => <label key={k} className="check"><input type="checkbox" checked={f.values.tiebreak.includes(k)} onChange={() => toggle(k)} /><span>{l}</span></label>)}</div><p className="field__error">{e.tiebreak}</p></fieldset>
        <div className="notice notice--warn">Changing points or tie-breaks recalculates every table immediately. The change is recorded in the audit log.</div>
        <FormError error={f.formError && !Object.keys(e).length ? f.formError : null} /><Button type="submit" loading={f.submitting}>Save settings</Button>
      </form>
      <div className="panel panel__body"><h3 style={{ marginBottom: 14 }}>Seasons</h3>
        <DataTable caption="Seasons" rows={seasons} columns={[{ key: 'name', header: 'Season' }, { key: 'status', header: 'Status', render: (x) => <Pill tone={x.status === 'active' ? 'ok' : 'neutral'}>{x.status}</Pill> }, { key: 'start', header: 'Dates', render: (x) => `${fmtDate(x.start)} – ${fmtDate(x.end)}`, sortable: false }, { key: 'act', header: '', sortable: false, render: (x) => x.status === 'draft' && <Button size="sm" variant="ghost" onClick={() => removeSeason(x)}>Delete</Button> }]} />
        <form onSubmit={s.submit} noValidate style={{ marginTop: 18 }}><FormGrid><Input label="New draft season" placeholder="2027/28 Season" {...s.bind('name')} error={s.errors.name} /><Checkbox label="Copy divisions from the active season" {...s.bindCheck('copy')} /></FormGrid><FormError error={s.formError && !Object.keys(s.errors).length ? s.formError : null} /><Button type="submit" variant="ghost" loading={s.submitting}>Create draft season</Button></form>
      </div>
    </div>
  );
}

export function AuditAdmin() {
  const [entity, setEntity] = useState('');
  const query = useQuery(api, '/league/admin/audit', { entity, limit: 200 });
  return (
    <>
      <div className="filters"><Select label="Filter by record type" value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="Everything" options={['fixture', 'registration', 'transfer', 'application', 'team', 'official', 'discipline', 'config', 'season', 'announcement', 'news', 'document', 'sponsor']} /></div>
      <Async query={query} skeleton={<Skeleton lines={8} />}>{(rows) => <DataTable caption="Audit log" rows={rows} empty="No entries." initialSort={{ key: 'at', dir: 'desc' }} columns={[{ key: 'at', header: 'When', render: (a) => fmtDateTime(a.at) }, { key: 'actor', header: 'Who' }, { key: 'action', header: 'Action' }, { key: 'entity', header: 'Record', render: (a) => `${a.entity} ${a.entityId}` }, { key: 'before', header: 'Before', render: (a) => <span className="muted">{a.before}</span> }, { key: 'after', header: 'After' }, { key: 'approved', header: 'Approved', render: (a) => (a.approved ? <Pill tone="ok">Yes</Pill> : '') }]} />}</Async>
    </>
  );
}

export function EnquiriesAdmin() {
  const query = useQuery(api, '/league/admin/enquiries');
  const [open, setOpen] = useState(null);
  return (
    <>
      <Async query={query} skeleton={<Skeleton lines={5} />}>{(rows) => <DataTable caption="Enquiries" rows={rows} empty="No enquiries yet." onRowClick={setOpen} initialSort={{ key: 'at', dir: 'desc' }} columns={[{ key: 'at', header: 'Received', render: (e) => fmtDateTime(e.at) }, { key: 'name', header: 'From' }, { key: 'kind', header: 'About' }, { key: 'message', header: 'Message', render: (e) => <span className="muted">{e.message.slice(0, 70)}</span>, sortable: false }]} />}</Async>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name || ''} eyebrow={open && `${open.kind} · ${fmtDateTime(open.at)}`} footer={open && <a className="btn btn--primary" href={`mailto:${open.email}`}>Reply by email</a>}>{open && <><dl className="kv"><dt>Email</dt><dd>{open.email}</dd>{open.org && <><dt>Organisation</dt><dd>{open.org}</dd></>}</dl><p style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>{open.message}</p></>}</Modal>
    </>
  );
}
