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
import { handleCallback as spotifyHandleCallback } from './services/spotifyService';
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code  = params.get('code');
    const error = params.get('error');
    if (error) {
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    if (code) {
      spotifyHandleCallback(code).then((username) => {
        if (username) setCurrentPage('profile');
      });
    }
  }, []);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState(null);
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
