import React, { useState, useEffect } from 'react';
import './Sidebar.css';

const Sidebar = ({ currentPage, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stats, setStats] = useState({ members: 0, online: 0, clips: 0 });
  const [onlineMembers, setOnlineMembers] = useState([]);

  useEffect(() => {
    const refresh = () => {
      const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
      const memberCount = users.length + 1;

      const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      const online = Object.entries(onlineData)
        .filter(([, ts]) => ts > fiveMinAgo)
        .map(([username]) => username);

      const clips = JSON.parse(localStorage.getItem('nova_clips') || '[]');

      setStats({ members: memberCount, online: online.length, clips: clips.length });
      setOnlineMembers(online);
    };

    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  const quickLinks = [
    { id: 'nabb',      label: 'NABB League',  icon: '⚾' },
    { id: 'sports',    label: 'Sports',       icon: '🏆' },
    { id: 'watchlist', label: 'Watch List',   icon: '🎬' },
    { id: 'members',   label: 'Member Pages', icon: '👥' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? '→' : '←'}
      </button>

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

      <div className="sidebar-section">
        {!isCollapsed && <h3>Online Members</h3>}
        <div className="online-members">
          {onlineMembers.length === 0 ? (
            !isCollapsed && (
              <p style={{ fontSize: '0.8rem', color: 'rgba(192,208,255,0.4)', padding: '4px 0' }}>
                No one online
              </p>
            )
          ) : (
            onlineMembers.map((username) => (
              <div key={username} className="member-indicator" title={username}>
                <div className="member-avatar">🚀</div>
                {!isCollapsed && <span className="member-name">{username}</span>}
                <div className="online-status"></div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-section">
        {!isCollapsed && <h3>Stats</h3>}
        <div className="stats">
          <div className="stat-item">
            <span className="stat-icon">👥</span>
            {!isCollapsed && (
              <>
                <span className="stat-label">Members</span>
                <span className="stat-value">{stats.members}</span>
              </>
            )}
          </div>
          <div className="stat-item">
            <span className="stat-icon">🎮</span>
            {!isCollapsed && (
              <>
                <span className="stat-label">Online</span>
                <span className="stat-value">{stats.online}</span>
              </>
            )}
          </div>
          <div className="stat-item">
            <span className="stat-icon">🎬</span>
            {!isCollapsed && (
              <>
                <span className="stat-label">Clips</span>
                <span className="stat-value">{stats.clips}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
