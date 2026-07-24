import React, { useState } from 'react';
import './Navbar.css';

const Navbar = ({ currentPage, onPageChange, onDashboard, onSignIn, onSignUp, onLogout, user, coins }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: 'home',    label: 'Home',    icon: 'Home' },
    { id: 'sports',  label: 'Sports',  icon: 'Trophy' },
    { id: 'leagues', label: 'Leagues', icon: 'Baseball' },
    { id: 'games',   label: 'Games',   icon: 'Gamepad' },
    { id: 'members', label: 'Members', icon: 'Users' },
    { id: 'music',   label: 'Music',   icon: 'Music' },
    { id: 'store',   label: 'Store',   icon: 'Store' },
  ];

  const staffRoles = ['owner', 'cofounder', 'mod', 'vizta_helper'];
  const isActive = (id) => currentPage === id || (id === 'leagues' && currentPage === 'player');

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => onPageChange('home')}>
          <img src="/nova-logo.png" alt="NOVA" className="navbar-logo-img" />
        </div>

        {/* Desktop tabs */}
        <div className="navbar-tabs desktop-tabs">
          {tabs.map(tab => (
            <button key={tab.id} className={`nav-tab ${isActive(tab.id) ? 'active' : ''}`} onClick={() => onPageChange(tab.id)}>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* User section */}
        <div className="navbar-user">
          {user ? (
            <>
              {typeof coins === 'number' && (
                <span className="navbar-coins">Coins: {coins}</span>
              )}
              <button className="user-button" onClick={() => onPageChange('profile')}>
                <span className="user-label">{user.username}</span>
              </button>
              {staffRoles.includes(user.role) && (
                <button className="user-button" onClick={onDashboard}>
                  <span className="user-label desk-only">Admin</span>
                </button>
              )}
              <button className="user-button signout-btn" onClick={onLogout}>
                <span className="user-label desk-only">Logout</span>
              </button>
            </>
          ) : (
            <>
              <button className="user-button signin-btn" onClick={onSignIn}>
                <span className="user-label">Sign In</span>
              </button>
              <button className="user-button signup-btn" onClick={onSignUp}>
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
              {tab.label}
            </button>
          ))}
          <div className="mobile-divider" />
          {user ? (
            <>
              <button className="mobile-tab" onClick={() => onPageChange('profile')}>{user.username}</button>
              {staffRoles.includes(user.role) && <button className="mobile-tab" onClick={onDashboard}>Admin</button>}
              <button className="mobile-tab" onClick={onLogout}>Logout</button>
            </>
          ) : (
            <>
              <button className="mobile-tab" onClick={onSignIn}>Sign In</button>
              <button className="mobile-tab" onClick={onSignUp}>Sign Up</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
