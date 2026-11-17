import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, FormError, FormGrid, Input, Link, Select, Textarea, useDocumentTitle, useForm } from '@jalingo/shared';
import { api } from '../api.js';
import { useClub } from '../data.jsx';
import { PageHero } from '../components/common.jsx';

const TYPES = [['general', 'General'], ['trials', 'Trials'], ['sponsorship', 'Partnership'], ['media', 'Media']];
const BASE = { name: '', email: '', phone: '', message: '', consent: false, website: '' };
const EXTRA = { general: {}, trials: { age: '', position: '', experience: '' }, sponsorship: { organisation: '', interest: '' }, media: { outlet: '', deadline: '' } };
const INTERESTS = ['Principal partnership', 'Kit partnership', 'Matchday partnership', 'Player or youth sponsorship', 'Community project', 'Something else'];

export default function Contact({ type }) {
  useDocumentTitle('Contact · Eland FC');
  const { club, positions } = useClub();
  const kind = TYPES.some(([k]) => k === type) ? type : 'general';
  const [sent, setSent] = useState(null);
  const ok = useRef(null);
  const f = useForm({ ...BASE, ...EXTRA[kind] }, async (v) => {
    const body = { type: kind, ...Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '')), consent: v.consent };
    if (body.age) body.age = Number(body.age);
    await api('/club/enquiries', { method: 'POST', body });
    setSent(kind);
  });
  useEffect(() => { f.reset({ ...BASE, ...EXTRA[kind] }); setSent(null); }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sent) ok.current?.focus(); }, [sent]);
  const e = f.errors;

  return (
    <>
      <PageHero eyebrow="Contact" title="Get in touch." lede="Players, supporters, partners and media: tell us what you need and the club will reply." />
      <section className="section on-light" aria-label="Contact options"><div className="wrap contact-grid">
        <aside className="stack">
          <h2 style={{ fontSize: '1.8rem' }}>Other ways to reach us</h2>
          <p className="muted">Follow the club for day-to-day updates, or use the form and we’ll respond by email.</p>
          <a className="btn btn--ghost" href={club.facebook} target="_blank" rel="noopener noreferrer">Eland FC on Facebook<span className="sr-only"> (opens in a new tab)</span></a>
          <p className="small muted">Based in Jalingo, Taraba State, Nigeria.</p>
        </aside>
        <div className="panel panel__body">
          <div className="seg" role="radiogroup" aria-label="Enquiry type">{TYPES.map(([k, l]) => <Link key={k} to={`/contact/${k}`} role="radio" aria-checked={kind === k} replace scroll={false} style={{ padding: '9px 18px', borderRadius: 99, fontWeight: 700, textDecoration: 'none', background: kind === k ? 'var(--accent)' : 'none', color: kind === k ? 'var(--accent-ink)' : 'inherit' }}>{l}</Link>)}</div>
          {sent ? (
            <div className="success" ref={ok} tabIndex={-1} role="status"><h3>Thank you. Your message is on its way.</h3><p className="muted">The club will reply to the email address you gave.</p><Button variant="ghost" onClick={() => { f.reset({ ...BASE, ...EXTRA[kind] }); setSent(null); }}>Send another message</Button></div>
          ) : (
            <form onSubmit={f.submit} noValidate>
              <FormGrid>
                <Input label="Full name" autoComplete="name" required {...f.bind('name')} error={e.name} />
                <Input label="Email" type="email" autoComplete="email" required {...f.bind('email')} error={e.email} />
                <Input label="Phone" type="tel" autoComplete="tel" optional {...f.bind('phone')} error={e.phone} />
                {kind === 'trials' && <><Input label="Age" type="number" inputMode="numeric" min="12" max="45" required {...f.bind('age')} error={e.age} />
                  <Select label="Preferred position" placeholder="Choose a position" options={Object.values(positions)} required {...f.bind('position')} error={e.position} />
                  <Input label="Current or most recent team" optional {...f.bind('experience')} error={e.experience} /></>}
                {kind === 'sponsorship' && <><Input label="Organisation" autoComplete="organization" required {...f.bind('organisation')} error={e.organisation} /><Select label="Area of interest" placeholder="Choose an option" options={INTERESTS} required {...f.bind('interest')} error={e.interest} /></>}
                {kind === 'media' && <><Input label="Outlet or publication" required {...f.bind('outlet')} error={e.outlet} /><Input label="Deadline" type="date" optional {...f.bind('deadline')} error={e.deadline} /></>}
                <Textarea label="Message" maxLength={1500} required hint="Up to 1,500 characters" {...f.bind('message')} error={e.message} />
                <div className="hp" aria-hidden="true"><label>Leave this empty<input tabIndex={-1} autoComplete="off" {...f.bind('website')} /></label></div>
                <Checkbox label={`I agree to ${club.fullName} using my details to reply to this enquiry.`} required {...f.bindCheck('consent')} error={e.consent} />
              </FormGrid>
              <FormError error={f.formError && !Object.keys(e).length ? f.formError : null} />
              <Button type="submit" loading={f.submitting}>Send message</Button>
            </form>
          )}
        </div>
      </div></section>
    </>
  );
}
