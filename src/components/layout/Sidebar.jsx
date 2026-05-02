import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ currentPage, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const quickLinks = [
    { id: 'nabb', label: 'NABB League', icon: '⚾' },
    { id: 'trending', label: 'Trending', icon: '⭐' },
    { id: 'recent', label: 'Recent Activity', icon: '📊' },
    { id: 'clips', label: 'Top Clips', icon: '🎬' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Toggle Button */}
      <button
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      {/* Quick Links */}
      <div className="sidebar-section">
        {!isCollapsed && <h3>Quick Links</h3>}
        <div className="quick-links">
          {quickLinks.map((link) => (
            <button
              key={link.id}
              className="quick-link"
              title={link.label}
              onClick={() => onNavigate(link.id)}
            >
              <span className="link-icon">{link.icon}</span>
              {!isCollapsed && <span className="link-label">{link.label}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Online Members */}
      <div className="sidebar-section">
        {!isCollapsed && <h3>Online Members</h3>}
        <div className="online-members">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="member-indicator" title={`Member ${i}`}>
              <div className="member-avatar">🚀</div>
              {!isCollapsed && <span className="member-name">Member {i}</span>}
              <div className="online-status"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Stats */}
      <div className="sidebar-section">
        {!isCollapsed && <h3>Stats</h3>}
        <div className="stats">
          <div className="stat-item">
            <span className="stat-icon">👥</span>
            {!isCollapsed && (
              <>
                <span className="stat-label">Members</span>
                <span className="stat-value">1,234</span>
              </>
            )}
          </div>
          <div className="stat-item">
            <span className="stat-icon">🎮</span>
            {!isCollapsed && (
              <>
                <span className="stat-label">Online</span>
                <span className="stat-value">42</span>
              </>
            )}
          </div>
          <div className="stat-item">
            <span className="stat-icon">🎬</span>
            {!isCollapsed && (
              <>
                <span className="stat-label">Clips</span>
                <span className="stat-value">567</span>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
