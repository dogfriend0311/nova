import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Home from './components/pages/Home';
import Hub from './components/pages/Hub';
import RobloxStats from './components/pages/RobloxStats';
import MemberPages from './components/pages/MemberPages';
import NABBLeague from './NABBLeague';
import LeaguePlayerPage from './LeaguePlayerPage';
import Login from './Login';
import OwnerDashboard from './OwnerDashboard';
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

  // If not logged in, show login
  if (!user) {
    return <Login />;
  }

  // If viewing dashboard, show it
  if (showDashboard) {
    return <OwnerDashboard onExit={() => setShowDashboard(false)} />;
  }

  // Otherwise show regular website
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'hub':
        return <Hub />;
      case 'roblox':
        return <RobloxStats />;
      case 'members':
        return <MemberPages />;
      case 'nabb':
        return <NABBLeague />;
      case 'player':
        return <LeaguePlayerPage />;
      default:
        return <Home />;
    }
  };

  return (
    <Layout 
      currentPage={currentPage} 
      onPageChange={setCurrentPage}
      onDashboard={() => setShowDashboard(true)}
    >
      {renderPage()}
    </Layout>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
