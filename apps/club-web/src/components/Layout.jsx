import { useEffect, useState } from 'react';
import { Icon, Link, NavLink, useRouter } from '@jalingo/shared';
import { useClub } from '../data.jsx';

const NAV = [['/', 'Home', true], ['/club', 'Club'], ['/teams', 'Teams'], ['/matches', 'Matches'], ['/news', 'News'], ['/partners', 'Partners'], ['/contact', 'Contact']];

export function Header() {
  const { club } = useClub();
  const { path } = useRouter();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { const on = () => setSolid(scrollY > 40); on(); addEventListener('scroll', on, { passive: true }); return () => removeEventListener('scroll', on); }, []);
  useEffect(() => { document.body.classList.toggle('menu-open', open); return () => document.body.classList.remove('menu-open'); }, [open]);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { const on = (e) => e.key === 'Escape' && setOpen(false); addEventListener('keydown', on); return () => removeEventListener('keydown', on); }, []);

  return (
    <header className={`site-header${solid ? ' is-solid' : ''}`}>
      <div className="wrap">
        <Link className="brand" to="/" aria-label={`${club.name} home`}>
          <svg aria-hidden="true"><use href="#mark" /></svg>
          <span><span className="brand__name">{club.name}</span><span className="brand__place">Jalingo · Taraba</span></span>
        </Link>
        <nav className="primary-nav" id="primaryNav" aria-label="Primary">
          <ul>{NAV.map(([to, label, end]) => <li key={to}><NavLink to={to} end={end}>{label}</NavLink></li>)}</ul>
          <div className="mobile-nav-extra"><Link className="btn btn--primary" to="/contact/sponsorship">Become a partner <Icon id="i-arrow" /></Link></div>
        </nav>
        <Link className="btn btn--primary header-cta" to="/contact/sponsorship">Become a partner</Link>
        <button type="button" className="menu-toggle" aria-controls="primaryNav" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
          <svg className="icon-menu" aria-hidden="true"><use href="#i-menu" /></svg><svg className="icon-close" aria-hidden="true"><use href="#i-close" /></svg>
        </button>
      </div>
    </header>
  );
}

export function Footer() {
  const { club } = useClub();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="cols">
          <div><Link className="brand" to="/"><svg aria-hidden="true" style={{ width: 36, height: 36 }}><use href="#mark" /></svg><span className="brand__name" style={{ color: '#fff' }}>{club.fullName}</span></Link><p style={{ marginTop: 16, maxWidth: '36ch' }}>A grassroots football club in Jalingo, Taraba State, Nigeria.</p></div>
          <div><h2>Club</h2><ul><li><Link to="/club">About</Link></li><li><Link to="/teams/squads">Squads</Link></li><li><Link to="/teams/staff">Staff</Link></li><li><Link to="/teams/register">Player register</Link></li></ul></div>
          <div><h2>Follow</h2><ul><li><Link to="/matches">Fixtures &amp; results</Link></li><li><Link to="/news">News</Link></li><li><a href={club.facebook} target="_blank" rel="noopener noreferrer">Facebook<span className="sr-only"> (opens in a new tab)</span></a></li></ul></div>
          <div><h2>Get involved</h2><ul><li><Link to="/contact/trials">Trial enquiry</Link></li><li><Link to="/partners">Partnerships</Link></li><li><Link to="/contact/media">Media</Link></li><li><Link to="/admin">Staff sign-in</Link></li></ul></div>
        </div>
        <p className="legal">© {new Date().getFullYear()} {club.fullName}. Photography is illustrative until replaced with club images.</p>
      </div>
    </footer>
  );
}

export function ToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => { const on = () => setShow(scrollY > 900); addEventListener('scroll', on, { passive: true }); return () => removeEventListener('scroll', on); }, []);
  return <button type="button" className={`icon-btn to-top${show ? ' is-visible' : ''}`} aria-label="Back to top" tabIndex={show ? 0 : -1} onClick={() => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}><Icon id="i-up" /></button>;
}
