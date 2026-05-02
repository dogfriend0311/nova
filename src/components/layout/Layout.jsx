import React from 'react';
import SpaceBackground from '../space/SpaceBackground';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ currentPage, onPageChange, onDashboard, children }) => {
  return (
    <div className="layout-container">
      <SpaceBackground />
      
      <Navbar currentPage={currentPage} onPageChange={onPageChange} onDashboard={onDashboard} />
      
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
