import React, { useState, useEffect } from 'react';
import db from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ currentPage, onNavigate }) => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stats, setStats] = useState({ members: 0, online: 0, clips: 0 });
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [unreadDMs, setUnreadDMs] = useState(0);

  useEffect(() => {
    if (!user || user.role === 'guest') { setUnreadDMs(0); return; }
    const refreshDMs = () => db.getUnreadDMCount(user.username).then(setUnreadDMs).catch(() => {});
    refreshDMs();
    const interval = setInterval(refreshDMs, 30000);
    return () => clearInterval(interval);
  }, [user]);

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
    { id: 'leagues',     label: 'Leagues',      icon: '' },
    { id: 'articles',    label: 'Articles',     icon: '📰' },
    { id: 'sports',      label: 'Sports',       icon: '🏆' },
    { id: 'simulations', label: 'Simulations',  icon: '⚾' },
    { id: 'perfectathlete', label: 'Perfect Athlete', icon: '🐐' },
    { id: 'games',       label: 'Games',        icon: '🎮' },
    { id: 'music',       label: 'Music',        icon: '🎵' },
    { id: 'store',       label: 'Store',        icon: '🛍️' },
    { id: 'members',     label: 'Member Pages', icon: '👥' },
    { id: 'staff',       label: 'Staff Directory', icon: '🛡️' },
    { id: 'messages',    label: 'Messages',     icon: '💬' },
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
              {link.id === 'messages' && unreadDMs > 0 && (
                <span style={{
                  marginLeft: isCollapsed ? 0 : 'auto', minWidth: 16, height: 16, borderRadius: 8,
                  background: 'var(--color-magenta)', color: '#fff', fontSize: '0.6rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>{unreadDMs > 9 ? '9+' : unreadDMs}</span>
              )}
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
