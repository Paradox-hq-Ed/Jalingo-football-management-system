import { AuthProvider, FeedbackProvider, Redirect, Routes, useReveals, useRouter, useDocumentTitle } from '@jalingo/shared';
import { api, ROLES } from './api.js';
import { LeagueProvider } from './data.jsx';
import { Footer, Header } from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Matches, { MatchDetail } from './pages/Matches.jsx';
import Tables from './pages/Tables.jsx';
import Stats from './pages/Stats.jsx';
import { Teams, TeamDetail, Players, PlayerDetail, Officials, OfficialDetail } from './pages/People.jsx';
import { News, Article, Competition, Contact } from './pages/Content.jsx';
import Portal from './portal/Portal.jsx';
import Admin from './admin/Admin.jsx';

const NotFound = () => { useDocumentTitle('Page not found · JFL'); return <div className="page-head"><div className="wrap"><h1 className="view-heading" tabIndex={-1}>Page not found</h1><p className="lede">That page doesn’t exist. Use the menu to find what you need.</p></div></div>; };

const routes = [
  { path: '/', render: () => <Home /> },
  { path: '/matches', render: () => <Matches /> }, { path: '/matches/:id', render: ({ id }) => <MatchDetail key={id} id={id} /> },
  { path: '/tables', render: () => <Tables /> }, { path: '/stats', render: () => <Stats /> },
  { path: '/teams', render: () => <Teams /> }, { path: '/teams/:id', render: ({ id }) => <TeamDetail key={id} id={id} /> },
  { path: '/players', render: () => <Players /> }, { path: '/players/:id', render: ({ id }) => <PlayerDetail key={id} id={id} /> },
  { path: '/officials', render: () => <Officials /> }, { path: '/officials/:id', render: ({ id }) => <OfficialDetail key={id} id={id} /> },
  { path: '/news', render: () => <News /> }, { path: '/news/:id', render: ({ id }) => <Article key={id} id={id} /> },
  { path: '/competition', render: () => <Competition /> }, { path: '/contact', render: () => <Contact /> },
  { path: '/portal', render: () => <Portal /> },
  { path: '/admin', render: () => <Admin section="" /> }, { path: '/admin/:section', render: ({ section }) => <Admin section={section} /> }
];

export default function App() {
  const { path } = useRouter();
  useReveals(path);
  return (
    <AuthProvider api={api} roles={ROLES}>
      <FeedbackProvider>
        <LeagueProvider>
          <a className="skip-link" href="#main">Skip to content</a>
          <Header />
          <main id="main" tabIndex={-1}><Routes routes={routes} fallback={<NotFound />} /></main>
          <Footer />
        </LeagueProvider>
      </FeedbackProvider>
    </AuthProvider>
  );
}
