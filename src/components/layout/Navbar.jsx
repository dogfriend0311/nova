import React, { useState } from 'react';
import './Navbar.css';

const Navbar = ({ currentPage, onPageChange, onDashboard, onSignIn, onSignUp, onLogout, user, coins }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: 'home',      label: 'Home',      icon: '🏠' },
    { id: 'sports',    label: 'Sports',    icon: '🏆' },
    { id: 'watchlist', label: 'Watch List',icon: '🎬' },
    { id: 'leagues',   label: 'Leagues',   icon: '⚾' },
    { id: 'members',   label: 'Members',   icon: '👥' },
    { id: 'lastfm',    label: 'Last.fm',   icon: '🎵' },
    { id: 'games',     label: 'Games',     icon: '🎮' },
    { id: 'store',     label: 'Store',     icon: '🛒' },
  ];

  const staffRoles = ['owner', 'cofounder', 'mod', 'nabb_helper', 'rbml_helper'];
  const isActive = (id) => currentPage === id || (id === 'leagues' && ['nabb','rbml'].includes(currentPage));

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => onPageChange('home')}>
          <div className="logo-icon">🚀</div>
          <h1>NOVA</h1>
        </div>

        {/* Desktop tabs */}
        <div className="navbar-tabs desktop-tabs">
          {tabs.map(tab => (
            <button key={tab.id} className={`nav-tab ${isActive(tab.id) ? 'active' : ''}`} onClick={() => onPageChange(tab.id)}>
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* User section */}
        <div className="navbar-user">
          {user ? (
            <>
              {typeof coins === 'number' && (
                <span className="navbar-coins">🪙 {coins}</span>
              )}
              <button className="user-button" onClick={() => onPageChange('profile')}>
                <span className="user-icon">👤</span>
                <span className="user-label">{user.username}</span>
              </button>
              {staffRoles.includes(user.role) && (
                <button className="user-button" onClick={onDashboard}>
                  <span className="user-icon">⚙️</span>
                  <span className="user-label desk-only">Admin</span>
                </button>
              )}
              <button className="user-button signout-btn" onClick={onLogout}>
                <span className="user-icon">🚪</span>
                <span className="user-label desk-only">Logout</span>
              </button>
            </>
          ) : (
            <>
              <button className="user-button signin-btn" onClick={onSignIn}>
                <span className="user-icon">🔑</span>
                <span className="user-label">Sign In</span>
              </button>
              <button className="user-button signup-btn" onClick={onSignUp}>
                <span className="user-icon">✨</span>
                <span className="user-label">Sign Up</span>
              </button>
            </>
          )}
          {/* Mobile hamburger */}
          <button className="hamburger" onClick={() => setMenuOpen(m => !m)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          {tabs.map(tab => (
            <button key={tab.id} className={`mobile-tab ${isActive(tab.id) ? 'active' : ''}`} onClick={() => onPageChange(tab.id)}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
          <div className="mobile-divider" />
          {user ? (
            <>
              <button className="mobile-tab" onClick={() => onPageChange('profile')}>👤 {user.username}</button>
              {staffRoles.includes(user.role) && <button className="mobile-tab" onClick={onDashboard}>⚙️ Admin</button>}
              <button className="mobile-tab" onClick={onLogout}>🚪 Logout</button>
            </>
          ) : (
            <>
              <button className="mobile-tab" onClick={onSignIn}>🔑 Sign In</button>
              <button className="mobile-tab" onClick={onSignUp}>✨ Sign Up</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
