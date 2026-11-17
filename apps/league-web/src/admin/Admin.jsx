import { Async, Link, NavLink, RequireAuth, Skeleton, fmtDateTime, useAuth, useDocumentTitle, useQuery, Pill } from '@jalingo/shared';
import { api } from '../api.js';
import { PageHead } from '../components/ui.jsx';
import { FixturesAdmin, ResultsAdmin, OfficialsAdmin } from './Fixtures.jsx';
import { TeamsAdmin, PlayersAdmin, DisciplineAdmin } from './People.jsx';
import { ContentAdmin, SettingsAdmin, AuditAdmin, EnquiriesAdmin } from './Manage.jsx';

const SECTIONS = [['', 'Dashboard'], ['fixtures', 'Fixtures'], ['results', 'Results', 'resultsToReview'], ['officials', 'Officials', 'pendingOfficials'], ['teams', 'Teams', 'pendingApplications'], ['players', 'Players', 'pendingPlayers'], ['discipline', 'Discipline', 'openCases'], ['content', 'Content'], ['enquiries', 'Enquiries', 'newEnquiries'], ['settings', 'Settings'], ['audit', 'Audit log']];

export default function Admin({ section = '' }) {
  useDocumentTitle('Administration · JFL');
  return (
    <RequireAuth roles={['admin']} loginTitle="Administration" loginNote="Competition office staff only."><AdminShell section={section} /></RequireAuth>
  );
}

function AdminShell({ section }) {
  const dash = useQuery(api, '/league/admin/dashboard');
  const label = SECTIONS.find(([k]) => k === section)?.[1] || 'Not found';
  const body = {
    '': <Dashboard dash={dash} />, fixtures: <FixturesAdmin />, results: <ResultsAdmin onChange={dash.reload} />, officials: <OfficialsAdmin onChange={dash.reload} />, teams: <TeamsAdmin onChange={dash.reload} />,
    players: <PlayersAdmin onChange={dash.reload} />, discipline: <DisciplineAdmin onChange={dash.reload} />, content: <ContentAdmin />, enquiries: <EnquiriesAdmin onChange={dash.reload} />, settings: <SettingsAdmin />, audit: <AuditAdmin />
  }[section];
  return (
    <>
      <PageHead title="Administration" lede="Run the competition: schedule, results, registrations, discipline and content." />
      <div className="wrap shell">
        <nav className="side-nav" aria-label="Administration">
          {SECTIONS.map(([k, l, c]) => <NavLink key={k} to={k ? `/admin/${k}` : '/admin'} end>{l}{dash.data?.[c] > 0 && <span className="count">{dash.data[c]}</span>}</NavLink>)}
        </nav>
        <div style={{ minWidth: 0 }}><h2 style={{ marginBottom: 20 }}>{label}</h2>{body || <p>Section not found.</p>}</div>
      </div>
    </>
  );
}

function Dashboard({ dash }) {
  const K = [['resultsToReview', 'Results to review', '/admin/results'], ['pendingApplications', 'Team applications', '/admin/teams'], ['pendingPlayers', 'Registrations pending', '/admin/players'], ['pendingTransfers', 'Transfers pending', '/admin/players'], ['openCases', 'Open disciplinary cases', '/admin/discipline'], ['pendingOfficials', 'Officials to approve', '/admin/officials'], ['missingReferee', 'Fixtures without a referee', '/admin/fixtures'], ['conflicts', 'Scheduling conflicts', '/admin/fixtures'], ['newEnquiries', 'New enquiries', '/admin/enquiries']];
  return (
    <Async query={dash} skeleton={<Skeleton lines={6} height={40} />}>{(d) => (
      <>
        <div className="kpis">{K.map(([k, l, to]) => <Link key={k} to={to} className={`kpi${d[k] > 0 ? ' is-hot' : ''}`}><b>{d[k]}</b><small>{l}</small></Link>)}</div>
        <h3 style={{ marginBottom: 10 }}>Recent activity</h3>
        <div className="panel"><ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{d.recentAudit.map((a) => <li key={a.id} className="panel__head" style={{ fontSize: '.92rem' }}><span><strong>{a.action}</strong> <span className="muted">· {a.actor}</span></span><span className="muted small">{fmtDateTime(a.at)}</span></li>)}</ul></div>
      </>
    )}</Async>
  );
}
