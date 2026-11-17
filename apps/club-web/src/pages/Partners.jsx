import { Link, useDocumentTitle } from '@jalingo/shared';
import { useClub } from '../data.jsx';
import { Arrow, PageHero, SectionHead } from '../components/common.jsx';

export default function Partners() {
  useDocumentTitle('Partners · Eland FC');
  const { partnerTiers, opportunities, roadmap } = useClub();
  return (
    <>
      <PageHero photo="balls" eyebrow="Partners" title="Grow with the club." lede="Local businesses can back Eland FC through matchday, kit, player and community partnerships." />
      <section className="section on-light" aria-labelledby="why-title"><div className="wrap">
        <SectionHead eyebrow="Why partner" title="Visible where Jalingo plays" id="why-title" />
        <div className="grid grid--3 reveal">
          {[['On the pitch', 'Kit, pitch-side and matchday presence at home fixtures.'], ['Online', 'Logo placement and recognition across the club website and match posts.'], ['In the community', 'Support youth pathways, trials and local events with the club’s name beside yours.']].map(([t, d]) => <div key={t} className="tier"><h3>{t}</h3><p className="muted" style={{ margin: 0 }}>{d}</p></div>)}
        </div>
      </div></section>
      <section className="section" id="opportunities" aria-labelledby="opps-title"><div className="wrap">
        <SectionHead eyebrow="Opportunities" title="Ways to get involved" id="opps-title" />
        <div className="tiers reveal">{opportunities.map((o) => (
          <article key={o.title} className="tier"><h3>{o.title}</h3><p className="muted" style={{ margin: 0 }}>{o.short}</p><ul>{o.includes.map((i) => <li key={i}>{i}</li>)}</ul><p className="small" style={{ margin: 0 }}><strong>Suits:</strong> {o.suits}</p></article>))}</div>
      </div></section>
      <section className="section on-paper" aria-labelledby="partner-register-title"><div className="wrap">
        <SectionHead eyebrow="Partner register" title="Open positions" id="partner-register-title" />
        <div className="stack">{partnerTiers.map((t) => (
          <div key={t.name}><h3 style={{ marginBottom: 10 }}>{t.name}</h3>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: `repeat(${Math.min(t.cols, 4)}, minmax(0, 1fr))` }}>{Array.from({ length: t.slots }, (_, i) => <div key={i} className="slot" style={{ minHeight: t.h }}>· available ·</div>)}</div></div>))}</div>
      </div></section>
      <section className="section on-light" aria-labelledby="steps-title"><div className="wrap">
        <SectionHead eyebrow="How it works" title="From enquiry to kick-off" id="steps-title" />
        <ol className="steps reveal">{['Tell us about your business and what you’d like to achieve.', 'The club shares the options that fit and what each includes.', 'Agree terms and the club confirms your position.', 'Your branding goes live and the club keeps you updated.'].map((s) => <li key={s}>{s}</li>)}</ol>
      </div></section>
      <section className="section on-ink-2" aria-labelledby="roadmap-title"><div className="wrap">
        <SectionHead eyebrow="Roadmap" title="Where this is heading" id="roadmap-title" />
        <div className="grid grid--3 reveal">{roadmap.map((r) => <div key={r.stage} className="tier"><p className="eyebrow">{r.stage}</p><h3>{r.label}</h3><ul>{r.items.map((i) => <li key={i}>{i}</li>)}</ul></div>)}</div>
        <div style={{ marginTop: 40 }}><Link className="btn btn--primary" to="/contact/sponsorship">Start a partnership enquiry <Arrow /></Link></div>
      </div></section>
    </>
  );
}
