import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Home from './components/pages/Home';
import Hub from './components/pages/Hub';
import SportsHub from './components/pages/SportsHub';
import MemberPages from './components/pages/MemberPages';
import MemberProfile from './components/pages/MemberProfile';
import NABBLeague from './NABBLeague';
import NABBRosters from './components/pages/NABBRosters';
import LeaguePlayerPage from './LeaguePlayerPage';
import Login from './components/auth/Login';
import OwnerDashboard from './components/admin/OwnerDashboard';
import './styles/globals.css';
import './styles/theme.css';
import './styles/animations.css';
import './styles/space.css';
import './styles/responsive.css';
import './Login.css';
import './OwnerDashboard.css';

const AppContent = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState(null);

  if (!user) return <Login />;
  if (showDashboard) return (
    <div style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: '#0a0a23' }}>
      <OwnerDashboard onExit={() => setShowDashboard(false)} />
    </div>
  );

  const handleSelectPlayer = (player) => {
    setSelectedLeaguePlayer(player);
    setCurrentPage('player');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'hub':
        return <Hub />;
      case 'sports':
        return <SportsHub />;
      case 'nabb':
        return <NABBLeague onSelectPlayer={handleSelectPlayer} />;
      case 'members':
        return <MemberPages />;
      case 'profile':
        return <MemberProfile />;
      case 'nabb-rosters':
        return <NABBRosters />;
      case 'player':
        return <LeaguePlayerPage player={selectedLeaguePlayer} onBack={() => setCurrentPage('nabb')} />;
      default:
        return <Home />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      onDashboard={() => setShowDashboard(true)}
      user={user}
    >
      {renderPage()}
    </Layout>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
