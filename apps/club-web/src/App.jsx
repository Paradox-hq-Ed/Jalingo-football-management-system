import { Routes, Redirect, FeedbackProvider, AuthProvider, useRouter, useReveals, useDocumentTitle } from '@jalingo/shared';
import { api } from './api.js';
import { ClubProvider } from './data.jsx';
import Sprite from './components/Sprite.jsx';
import { Header, Footer, ToTop } from './components/Layout.jsx';
import Sheets from './components/Sheets.jsx';
import Home from './pages/Home.jsx';
import Club from './pages/Club.jsx';
import Teams from './pages/Teams.jsx';
import Matches from './pages/Matches.jsx';
import News, { Story } from './pages/News.jsx';
import Partners from './pages/Partners.jsx';
import Contact from './pages/Contact.jsx';
import Admin from './admin/Admin.jsx';

const NotFound = () => { useDocumentTitle('Page not found · Eland FC'); return <div className="page-hero"><div className="wrap"><h1 className="view-heading" tabIndex={-1}>Page not found.</h1><p className="lede">That page doesn’t exist. Try the menu above or go back <a href="/">home</a>.</p></div></div>; };

const routes = [
  { path: '/', render: () => <Home /> },
  { path: '/club', render: () => <Club /> },
  { path: '/teams', render: () => <Redirect to="/teams/squads" /> },
  { path: '/teams/squads', render: () => <Teams panel="squads" /> },
  { path: '/teams/squads/:squad', render: ({ squad }) => <Teams panel="squads" squad={squad} /> },
  { path: '/teams/staff', render: () => <Teams panel="staff" /> },
  { path: '/teams/register', render: () => <Teams panel="register" /> },
  { path: '/matches', render: () => <Matches /> },
  { path: '/matches/:filter', render: ({ filter }) => <Matches filter={filter} /> },
  { path: '/news', render: () => <News /> },
  { path: '/news/:id', render: ({ id }) => <Story key={id} id={id} /> },
  { path: '/partners', render: () => <Partners /> },
  { path: '/contact', render: () => <Contact /> },
  { path: '/contact/:type', render: ({ type }) => <Contact type={type} /> },
  { path: '/admin', render: () => <Admin /> }
];

export default function App() {
  const { path } = useRouter();
  useReveals(path);
  return (
    <AuthProvider api={api} roles={['club_admin']}>
      <FeedbackProvider>
        <ClubProvider>
          <Sprite />
          <a className="skip-link" href="#main">Skip to content</a>
          <Header />
          <main id="main" tabIndex={-1}><Routes routes={routes} fallback={<NotFound />} /></main>
          <Footer /><ToTop /><Sheets />
        </ClubProvider>
      </FeedbackProvider>
    </AuthProvider>
  );
}
