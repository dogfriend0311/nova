import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Home from './components/pages/Home';
import SportsHub from './components/pages/SportsHub';
import WatchList from './components/pages/WatchList';
import MemberPages from './components/pages/MemberPages';
import MemberProfile from './components/pages/MemberProfile';
import NABBLeague from './NABBLeague';
import NABBRosters from './components/pages/NABBRosters';
import LeaguePlayerPage from './LeaguePlayerPage';
import LoginModal from './components/auth/LoginModal';
import OwnerDashboard from './components/admin/OwnerDashboard';
import LastFmPage from './components/pages/LastFmPage';
import './styles/globals.css';
import './styles/theme.css';
import './styles/animations.css';
import './styles/space.css';
import './styles/responsive.css';
import './Login.css';
import './OwnerDashboard.css';
import './components/auth/LoginModal.css';

const AppContent = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [lfmToken, setLfmToken] = useState(null);

  const [showDashboard, setShowDashboard] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState(null);

  /* Detect Last.fm OAuth callback: ?token=XXX in the URL */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      window.history.replaceState({}, '', window.location.pathname);
      setLfmToken(token);
      setCurrentPage('lastfm');
    }
  }, []);
  if (showDashboard) return (
    <div style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: '#0a0a23' }}>
      <OwnerDashboard onExit={() => setShowDashboard(false)} />
    </div>
  );

  const handleSelectPlayer = (player) => {
    setSelectedLeaguePlayer(player);
    setCurrentPage('player');
  };

  const handlePageChange = (page) => {
    if (page === 'profile' && !user) { setShowLoginModal(true); return; }
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':         return <Home />;
      case 'sports':       return <SportsHub />;
      case 'watchlist':    return <WatchList onSignIn={() => setShowLoginModal(true)} />;
      case 'nabb':         return <NABBLeague onSelectPlayer={handleSelectPlayer} />;
      case 'members':      return <MemberPages />;
      case 'profile':      return user ? <MemberProfile /> : <Home />;
      case 'lastfm':       return <LastFmPage pendingToken={lfmToken} onTokenConsumed={() => setLfmToken(null)} />;
      case 'nabb-rosters': return <NABBRosters />;
      case 'player':       return <LeaguePlayerPage player={selectedLeaguePlayer} onBack={() => setCurrentPage('nabb')} />;
      default:             return <Home />;
    }
  };

  return (
    <>
      <Layout
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onDashboard={() => setShowDashboard(true)}
        onSignIn={() => setShowLoginModal(true)}
        user={user}
      >
        {renderPage()}
      </Layout>
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
