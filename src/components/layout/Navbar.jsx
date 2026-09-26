import React, { useState, useEffect } from 'react';
import { Sun, Moon, Home, CircleDot, Rss, FileText, Twitter, Trophy, Gamepad2, Music, Store, Users } from 'lucide-react';
import { useTheme } from '../../services/useTheme';
import CommandPalette from '../CommandPalette';
import NotificationBell from '../NotificationBell';
import './Navbar.css';

const Navbar = ({ currentPage, onPageChange, onDashboard, onSignIn, onSignUp, onLogout, user, coins }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Subtle "lift" once the page scrolls — gives the bar a bit of depth
  // instead of sitting flat against the content the whole time.
  useEffect(() => {
    const onScroll = () => {
      const scroller = document.querySelector('.main-content');
      setScrolled((scroller ? scroller.scrollTop : window.scrollY) > 4);
    };
    const scroller = document.querySelector('.main-content');
    (scroller || window).addEventListener('scroll', onScroll);
    return () => (scroller || window).removeEventListener('scroll', onScroll);
  }, []);

  const tabs = [
    { id: 'home',        label: 'Home',        Icon: Home },
    { id: 'leagues',     label: 'Leagues',     Icon: CircleDot },
    { id: 'feed',        label: 'Feed',        Icon: Rss },
    { id: 'articles',    label: 'Articles',    Icon: FileText },
    { id: 'tweets',      label: 'Tweets',      Icon: Twitter },
    { id: 'sports',      label: 'Sports',      Icon: Trophy },
    { id: 'games',       label: 'Games',       Icon: Gamepad2 },
    { id: 'music',       label: 'Music',       Icon: Music },
    { id: 'store',       label: 'Store',       Icon: Store },
    { id: 'members',     label: 'Members',     Icon: Users },
  ];

  const staffRoles = ['owner', 'cofounder', 'mod', 'vizta_helper', 'football_helper'];
  const isActive = (id) =>
    currentPage === id ||
    (id === 'leagues' && currentPage === 'player') ||
    (id === 'games' && currentPage === 'perfectathlete');

  return (
    <nav className={`navbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => onPageChange('home')}>
          <img src="/nova-logo.png" alt="NOVA" className="navbar-logo-img" />
        </div>

        {/* Desktop tabs */}
        <div className="navbar-tabs desktop-tabs">
          {tabs.map(tab => (
            <button key={tab.id} className={`nav-tab ${isActive(tab.id) ? 'active' : ''}`} onClick={() => onPageChange(tab.id)}>
              <tab.Icon size={15} className="tab-icon-svg" strokeWidth={2.25} />
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* User section */}
        <div className="navbar-user">
          <CommandPalette />
          <NotificationBell />
          <button
            className="user-button theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
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
              <tab.Icon size={16} strokeWidth={2.25} />
              {tab.label}
            </button>
          ))}
          <div className="mobile-divider" />
          <button className="mobile-tab" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
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
