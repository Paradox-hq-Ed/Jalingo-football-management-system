import { useState } from 'react';
import { Async, Button, Icon, Link, Modal, Pill, Tabs, TabPanel, fmt, toDate, useQuery, useQueryParams, photoUrl } from '@jalingo/shared';
import { api } from '../api.js';
import { useClub } from '../data.jsx';
import { STATUS_LABEL, monogram } from './common.jsx';

/* Detail views are driven by the URL (?player=, ?person=, ?match=, ?photo=) so they can be shared and the back button closes them. */
export default function Sheets() {
  const [q, setQ] = useQueryParams();
  const close = (key) => setQ({ [key]: null, tab: null }, { replace: false });
  return (
    <>
      {q.get('player') && <PlayerSheet id={q.get('player')} onClose={() => close('player')} tab={q.get('tab') || 'overview'} setTab={(t) => setQ({ tab: t })} />}
      {q.get('person') && <PersonSheet id={q.get('person')} onClose={() => close('person')} />}
      {q.get('match') && <MatchSheet id={q.get('match')} onClose={() => close('match')} />}
      {q.get('photo') !== null && q.get('photo') !== '' && <PhotoViewer index={Number(q.get('photo'))} onClose={() => close('photo')} setIndex={(i) => setQ({ photo: i })} />}
    </>
  );
}

function PlayerSheet({ id, onClose, tab, setTab }) {
  const { positions, availability, contractTypes, squadById, season } = useClub();
  const query = useQuery(api, `/club/players/${id}`);
  const p = query.data;
  const title = p ? p.name || `No. ${p.num} · ${positions[p.pos]}` : 'Player';
  return (
    <Modal open onClose={onClose} variant="side" title={title} eyebrow={p ? `${squadById(p.squad).name} · ${p.reg}` : undefined}>
      <Async query={query}>{(p) => {
        const c = p.contract, st = c.status;
        const fm = (iso) => fmt.monthYear.format(toDate(iso));
        const tone = { active: 'ok', expiring: 'warn', trial: 'info', loan: 'info' }[st.key];
        return (
          <>
            <div className="row" style={{ marginBottom: 16 }}><Pill tone={p.availability === 'available' ? 'ok' : 'bad'}>{availability[p.availability]}</Pill><Pill tone={tone}>{st.label}</Pill>{!p.name && <span className="muted small">Name to be confirmed</span>}</div>
            <Tabs value={tab} onChange={setTab} label="Player profile" tabs={[{ key: 'overview', label: 'Overview' }, { key: 'contract', label: 'Contract' }, { key: 'career', label: 'Career' }]} />
            <TabPanel id="overview" active={tab === 'overview'}>
              <div className="stats-row" style={{ marginBottom: 20 }}>
                {[['Apps', p.sample.apps], ['Goals', p.sample.goals], ['Assists', p.sample.assists], p.pos === 'GK' && ['Clean sheets', p.sample.cleanSheets], ['Yellow', p.sample.yellow], ['Red', p.sample.red]].filter(Boolean).map(([k, v]) => <div key={k}><b>{v}</b><small>{k}</small></div>)}
              </div>
              <dl className="kv"><dt>Position</dt><dd>{positions[p.pos]}</dd><dt>Shirt number</dt><dd>{p.num}</dd><dt>Registration</dt><dd>{p.reg}</dd><dt>Season</dt><dd>{season}</dd></dl>
            </TabPanel>
            <TabPanel id="contract" active={tab === 'contract'}>
              <dl className="kv"><dt>Type</dt><dd>{contractTypes[c.type]}</dd><dt>Started</dt><dd>{fm(c.startDate)}</dd><dt>Expires</dt><dd>{fm(c.endDate)}</dd><dt>Registered</dt><dd>{c.registered ? 'Yes' : 'Not yet'}</dd></dl>
              <p className="muted small" style={{ marginTop: 16 }}>Only public contract information is shown. Wages, fees and other financial terms are confidential and are never published.</p>
            </TabPanel>
            <TabPanel id="career" active={tab === 'career'}>
              <table className="table"><thead><tr><th>Season</th><th>Squad</th><th className="num">Apps</th><th className="num">Goals</th></tr></thead>
                <tbody>{p.career.map((r) => <tr key={r.season}><td>{r.season}</td><td>{squadById(r.squad).name}</td><td className="num">{r.apps}</td><td className="num">{r.goals}</td></tr>)}</tbody></table>
            </TabPanel>
          </>
        );
      }}</Async>
    </Modal>
  );
}

function PersonSheet({ id, onClose }) {
  const { personById, departments, squadById } = useClub();
  const p = personById(id);
  const [, setQ] = useQueryParams();
  return (
    <Modal open onClose={onClose} variant="side" title={p?.role || 'Not found'} eyebrow={p && departments[p.dept].name}>
      {p ? (
        <>
          <div className="row" style={{ marginBottom: 18 }}><span className="monogram">{monogram(p.role)}</span><span className="muted">Name to be confirmed</span></div>
          <h3 style={{ marginBottom: 8 }}>Responsibilities</h3>
          <ul>{p.duties.map((d) => <li key={d}>{d}</li>)}</ul>
          <dl className="kv" style={{ marginTop: 20 }}><dt>Works with</dt><dd>{p.squads}</dd><dt>Reports to</dt><dd>{p.reportsTo ? <button type="button" className="row-link" onClick={() => setQ({ person: p.reportsTo })}>{personById(p.reportsTo).role}</button> : '—'}</dd>{p.qual && <><dt>Background</dt><dd>{p.qual}</dd></>}</dl>
        </>
      ) : <p>That role doesn’t exist.</p>}
    </Modal>
  );
}

function icsFor(m, club) {
  const d = toDate(m.date, m.time), end = new Date(d.getTime() + 2 * 36e5);
  const f = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const name = m.home ? `${club.name} v ${m.opponent}` : `${m.opponent} v ${club.name}`;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Eland FC//EN', 'BEGIN:VEVENT', `UID:${m.id}@elandfc`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(d)}`, `DTEND:${f(end)}`, `SUMMARY:${name}`, `LOCATION:${m.venue}`, `DESCRIPTION:${m.competition}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

function MatchSheet({ id, onClose }) {
  const { club, sampleLineup, positions } = useClub();
  const query = useQuery(api, `/club/matches/${id}`);
  const players = useQuery(api, '/club/players', { squad: 'first' });
  const m = query.data;
  const download = () => {
    const url = URL.createObjectURL(new Blob([icsFor(m, club)], { type: 'text/calendar' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${m.id}.ics` }); a.click(); URL.revokeObjectURL(url);
  };
  return (
    <Modal open onClose={onClose} variant="side" title={m ? (m.home ? `${club.name} v ${m.opponent}` : `${m.opponent} v ${club.name}`) : 'Match'} eyebrow={m && `${m.competition} · ${STATUS_LABEL[m.status]}`}>
      <Async query={query}>{(m) => {
        const date = toDate(m.date, m.time), byNum = Object.fromEntries((players.data || []).map((p) => [p.num, p]));
        const label = (n) => { const p = byNum[n]; return p ? `No. ${n} · ${positions[p.pos]}` : `No. ${n}`; };
        return (
          <>
            {m.score && <p style={{ font: '800 3.4rem/1 var(--font-display)', margin: '0 0 12px' }}>{m.home ? `${m.score[0]}–${m.score[1]}` : `${m.score[1]}–${m.score[0]}`}</p>}
            <dl className="kv"><dt>Date</dt><dd>{fmt.long.format(date)}</dd><dt>Kick-off</dt><dd>{m.time}</dd><dt>Venue</dt><dd>{m.venue}</dd><dt>{club.name}</dt><dd>{m.home ? 'Home' : 'Away'}</dd>{m.potm && <><dt>Player of the match</dt><dd>{label(m.potm)}</dd></>}</dl>
            {m.events?.length > 0 && <><h3 style={{ margin: '24px 0 8px' }}>Match events</h3><ul className="timeline">{m.events.map((e, i) => <li key={i}><b>{e.min}′</b><span>{e.type === 'goal' ? '⚽ Goal' : '🟨 Yellow card'} · {e.side === 'eland' ? `${club.name}${e.num ? ` (${label(e.num)})` : ''}` : m.opponent}</span></li>)}</ul></>}
            {m.score && <><h3 style={{ margin: '24px 0 8px' }}>Line-up (sample)</h3><p className="muted small">Starting XI: {sampleLineup.xi.map((n) => `#${n}`).join(', ')}<br />Substitutes: {sampleLineup.subs.map((n) => `#${n}`).join(', ')}</p></>}
            {m.status === 'upcoming' && <Button variant="ghost" onClick={download} style={{ marginTop: 20 }}><Icon id="i-download" className="btn-icon" /> Add to calendar</Button>}
          </>
        );
      }}</Async>
    </Modal>
  );
}

function PhotoViewer({ index, onClose, setIndex }) {
  const { photos } = useClub();
  const gallery = useQuery(api, '/club/gallery');
  const items = gallery.data || [];
  const g = items[index];
  const step = (d) => setIndex((index + d + items.length) % items.length);
  return (
    <Modal open onClose={onClose} size="lg" title={g?.alt || 'Photo'} footer={items.length > 1 && <><Button variant="ghost" onClick={() => step(-1)}>Previous</Button><span className="muted" style={{ alignSelf: 'center' }}>{index + 1} / {items.length}</span><Button variant="ghost" onClick={() => step(1)}>Next</Button></>}>
      {g ? <div className="media" style={{ aspectRatio: '3/2' }}><img src={photoUrl(photos, g.photo, 1600)} alt={`${g.alt} (illustrative photograph)`} onError={(e) => e.currentTarget.closest('.media')?.classList.add('img-failed')} /></div> : <p>Loading…</p>}
    </Modal>
  );
}
