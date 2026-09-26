import React, { useState } from 'react';
import SpaceBackground from '../space/SpaceBackground';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ currentPage, onPageChange, onDashboard, onSignIn, onSignUp, onLogout, children, user, coins }) => {
  // Lifted up from Sidebar so main-content's margin can track it — the
  // sidebar starts collapsed (see Sidebar.jsx) and previously nothing here
  // adjusted the content margin to match, leaving a blank 200px gap.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <div className="layout-container">
      <SpaceBackground />
      <div className="bg-logo-watermark" aria-hidden="true">
        <img src="/nova-watermark.png" alt="" />
      </div>

      <Navbar currentPage={currentPage} onPageChange={onPageChange} onDashboard={onDashboard} onSignIn={onSignIn} onSignUp={onSignUp} onLogout={onLogout} user={user} coins={coins} />

      <div className="layout-wrapper">
        <Sidebar currentPage={currentPage} onNavigate={onPageChange} collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed(v => !v)} />

        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
