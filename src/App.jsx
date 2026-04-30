import React, { useState } from 'react';
import Layout from './components/layout/Layout';
import Home from './components/pages/Home';
import Hub from './components/pages/Hub';
import RobloxStats from './components/pages/RobloxStats';
import MemberPages from './components/pages/MemberPages';
import './styles/globals.css';
import './styles/theme.css';
import './styles/animations.css';
import './styles/space.css';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');

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
      default:
        return <Home />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

export default App;
