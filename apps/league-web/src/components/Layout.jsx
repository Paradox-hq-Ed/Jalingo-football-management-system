import { useEffect, useState } from 'react';
import { Link, NavLink, useAuth, useRouter } from '@jalingo/shared';
import { useLeague } from '../data.jsx';

const NAV = [['/', 'Home', true], ['/matches', 'Matches'], ['/tables', 'Tables'], ['/stats', 'Stats'], ['/teams', 'Teams'], ['/players', 'Players'], ['/officials', 'Officials'], ['/news', 'News'], ['/competition', 'Competition']];

export function Header() {
  const { config } = useLeague();
  const { user, logout } = useAuth();
  const { path } = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => { document.body.classList.toggle('menu-open', open); return () => document.body.classList.remove('menu-open'); }, [open]);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { const on = (e) => e.key === 'Escape' && setOpen(false); addEventListener('keydown', on); return () => removeEventListener('keydown', on); }, []);
  return (
    <header className="site-header"><div className="wrap">
      <Link to="/" className="brand" aria-label={`${config.compName} home`}><span className="brand__mark" aria-hidden="true">{config.shortName[0]}</span><span><span className="brand__name">{config.compName}</span><small>{config.tagline}</small></span></Link>
      <nav className="primary-nav" id="primaryNav" aria-label="Primary">
        <ul>
          {NAV.map(([to, l, end]) => <li key={to}><NavLink to={to} end={end}>{l}</NavLink></li>)}
          <li className="only-menu">{user ? <><NavLink to={user.role === 'admin' ? '/admin' : '/portal'}>{user.role === 'admin' ? 'Admin' : 'My portal'}</NavLink><button type="button" className="menu-link" onClick={logout}>Sign out</button></> : <NavLink to="/portal">Sign in</NavLink>}</li>
        </ul>
      </nav>
      <div className="user-chip">
        {user ? <><Link className="btn btn--primary btn--sm" to={user.role === 'admin' ? '/admin' : '/portal'}>{user.role === 'admin' ? 'Admin' : 'My portal'}</Link><button type="button" className="btn btn--ghost btn--sm" onClick={logout}>Sign out</button></>
          : <Link className="btn btn--ghost btn--sm" to="/portal">Sign in</Link>}
      </div>
      <button type="button" className="menu-toggle" aria-controls="primaryNav" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>{open ? '×' : '☰'}</button>
    </div></header>
  );
}

export function Footer() {
  const { config, season } = useLeague();
  return (
    <footer className="footer"><div className="wrap">
      <div className="cols">
        <div><p className="brand__name" style={{ color: '#fff', fontSize: '1.5rem' }}>{config.compName}</p><p style={{ marginTop: 10, maxWidth: '34ch' }}>{season.name} · {config.tagline}</p></div>
        <div><h2>Competition</h2><ul><li><Link to="/matches">Fixtures &amp; results</Link></li><li><Link to="/tables">Tables</Link></li><li><Link to="/stats">Statistics</Link></li><li><Link to="/competition">Rules &amp; documents</Link></li></ul></div>
        <div><h2>People</h2><ul><li><Link to="/teams">Teams</Link></li><li><Link to="/players">Players</Link></li><li><Link to="/officials">Match officials</Link></li></ul></div>
        <div><h2>Get involved</h2><ul><li><Link to="/contact">Contact</Link></li><li><Link to="/portal">Club &amp; official portals</Link></li><li><Link to="/admin">Administration</Link></li></ul></div>
      </div>
      <p className="legal">{config.status}. Club names and people shown are illustrative.</p>
    </div></footer>
  );
}
