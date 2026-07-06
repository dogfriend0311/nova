import React from 'react';
import SpaceBackground from '../space/SpaceBackground';
import ViztaBackground from '../space/ViztaBackground';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

// Pages that belong to the Vizta League section get the custom background
// image instead of the site-wide star field. Everything else keeps stars.
const VIZTA_PAGES = ['leagues', 'player'];

const Layout = ({ currentPage, onPageChange, onDashboard, onSignIn, onSignUp, onLogout, children, user, coins }) => {
  const isVizta = VIZTA_PAGES.includes(currentPage);

  return (
    <div className="layout-container">
      {isVizta ? <ViztaBackground /> : <SpaceBackground />}

      <Navbar currentPage={currentPage} onPageChange={onPageChange} onDashboard={onDashboard} onSignIn={onSignIn} onSignUp={onSignUp} onLogout={onLogout} user={user} coins={coins} />

      <div className="layout-wrapper">
        <Sidebar currentPage={currentPage} onNavigate={onPageChange} />

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
