import React from 'react';
import './Navbar.css';

const Navbar = ({ currentPage, onPageChange, onDashboard }) => {
  const tabs = [
    { id: 'home', label: 'Home Page', icon: '🏠' },
    { id: 'hub', label: 'Hub', icon: '🌐' },
    { id: 'roblox', label: 'Roblox League', icon: '🎮' },
    { id: 'members', label: 'Member Pages', icon: '👥' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo">
          <div className="logo-icon">🚀</div>
          <h1>NOVA</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="navbar-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${currentPage === tab.id ? 'active' : ''}`}
              onClick={() => onPageChange(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* User Account / Admin */}
        <div className="navbar-user">
          <button className="user-button" onClick={onDashboard}>
            <span className="user-icon">⚙️</span>
            <span className="user-label">Admin</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
