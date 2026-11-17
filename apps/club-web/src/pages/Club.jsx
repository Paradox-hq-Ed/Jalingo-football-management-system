import { Icon, Link, useDocumentTitle, useQuery, useQueryParams } from '@jalingo/shared';
import { api } from '../api.js';
import { useClub } from '../data.jsx';
import { PageHero, SectionHead, monogram, Arrow } from '../components/common.jsx';

export default function Club() {
  useDocumentTitle('Club · Eland FC');
  const { club, org, people, personById, departments, governance, records, squads } = useClub();
  const [, setQ] = useQueryParams();
  const former = useQuery(api, '/club/former');
  const current = useQuery(api, '/club/players');
  const openPerson = (id) => setQ({ person: id }, { replace: false });

  // Same all-time register arithmetic as the Teams page, used for records and governance counts.
  const reg = [...(current.data || []).map((p) => ({ reg: p.reg, apps: p.career.reduce((n, c) => n + c.apps, 0), goals: p.career.reduce((n, c) => n + c.goals, 0) })), ...(former.data || [])];
  const top = (k) => [...reg].sort((a, b) => b[k] - a[k])[0];
  const recordText = { 'register-apps': top('apps') && `${top('apps').apps} appearances · ${top('apps').reg} (sample)`, 'register-goals': top('goals') && `${top('goals').goals} goals · ${top('goals').reg} (sample)`, 'register-count': `${reg.length} all-time registrations (sample)` };
  const computed = { players: `${(current.data || []).length} (sample)`, squads: `${squads.filter((s) => s.status !== 'proposed').length} active, ${squads.filter((s) => s.status === 'proposed').length} proposed (sample)` };
  const node = (id, top) => <button key={id} type="button" className={`org__node${top ? ' is-top' : ''}`} onClick={() => openPerson(id)}><strong>{personById(id).role}</strong><span>Name to be confirmed</span></button>;

  return (
    <>
      <PageHero photo="aerial" eyebrow="The club" title="Built in Jalingo." lede="Who we are, how the club is run, and what we’re working towards." />
      <section className="section on-light" id="club-overview" aria-labelledby="facts-title"><div className="wrap grid grid--2" style={{ gap: 48 }}>
        <div className="reveal"><p className="eyebrow">At a glance</p><h2 id="facts-title">Club facts</h2><p className="muted" style={{ marginTop: 16 }}>Verified details are marked. Everything else is waiting for the club to confirm.</p></div>
        <ul className="facts reveal">{club.facts.map((f) => (
          <li key={f.k}><span className="k">{f.k}</span><span className="v">
            {f.placeholder ? <span className="placeholder-field">{f.placeholder}</span> : f.link === 'facebook' ? <a href={club.facebook} target="_blank" rel="noopener noreferrer">{f.v}<span className="sr-only"> (opens in a new tab)</span></a> : f.v}
            {f.verified && <span className="tag-verified"><Icon id="i-check" />Verified</span>}</span></li>))}</ul>
      </div></section>

      <section className="section on-ink-2" id="club-structure" aria-labelledby="structure-title"><div className="wrap">
        <SectionHead eyebrow="Structure" title="How the club is organised" id="structure-title" />
        <div className="org reveal">
          <div className="org__level">{node(org.top, true)}</div>
          <div className="org__level">{org.management.map((id) => node(id))}</div>
          <div className="org__branches">{org.branches.map((b) => (
            <div className="org__branch" key={b.title}><h3>{b.title}</h3><ul>
              {b.people.map((id) => <li key={id}><button type="button" onClick={() => openPerson(id)}><span>{personById(id).role}<br /><small>{departments[personById(id).dept].name}</small></span><Icon id="i-chevron" /></button></li>)}
              {b.links.map((l) => <li key={l.label}>{l.href ? <Link to={l.href}><span>{l.label}</span><Icon id="i-arrow" /></Link> : <button type="button" onClick={() => document.getElementById(l.scroll)?.scrollIntoView({ behavior: 'smooth' })}><span>{l.label}</span><Icon id="i-arrow" /></button>}</li>)}
            </ul></div>))}</div>
        </div>
      </div></section>

      <section className="section on-light" id="club-management" aria-labelledby="management-title"><div className="wrap">
        <SectionHead eyebrow="Leadership" title="Management & administration" id="management-title" />
        <div className="grid grid--3 reveal">{people.filter((p) => ['management', 'commercial', 'welfare'].includes(p.dept)).map((p) => (
          <button key={p.id} type="button" className="person-card" onClick={() => openPerson(p.id)}><span className="monogram">{monogram(p.role)}</span><div><h3>{p.role}</h3><p style={{ marginTop: 6 }} className="muted">{p.duties[0]}</p></div><span className="foot"><span>Name to be confirmed</span><Icon id="i-arrow" /></span></button>))}</div>
      </div></section>

      <section className="section on-paper" id="club-governance" aria-labelledby="governance-title"><div className="wrap grid grid--2" style={{ gap: 48 }}>
        <div className="reveal"><p className="eyebrow">Governance</p><h2 id="governance-title">Registration &amp; policies</h2>
          <ul className="facts" style={{ marginTop: 24 }}>{governance.registration.map((g) => <li key={g.k}><span className="k">{g.k}</span><span className="v">{g.computed ? computed[g.computed] : <span className="placeholder-field">{g.placeholder}</span>}</span></li>)}</ul></div>
        <ul className="facts reveal" style={{ alignSelf: 'end' }}>{governance.policies.map((g) => <li key={g.k}><span className="k">{g.k}</span><span className="v" style={{ justifyContent: 'space-between' }}><span style={{ fontWeight: 500 }}>{g.v}</span><span className="status">To be published</span></span></li>)}</ul>
      </div></section>

      <section className="section" id="club-honours" aria-labelledby="honours-title"><div className="wrap">
        <SectionHead eyebrow="History" title="Records & honours" id="honours-title" />
        <div className="records reveal">{records.map((r) => <div key={r.k}><small>{r.k}</small><p>{r.source ? recordText[r.source] || '…' : r.text}</p></div>)}</div>
      </div></section>
    </>
  );
}
