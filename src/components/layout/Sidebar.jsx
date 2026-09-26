import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, CircleDot, Rss, FileText, Twitter, Trophy,
  Gamepad2, Music, Store, Users, Shield, Flame, MessageCircle, Film,
} from 'lucide-react';
import db from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ currentPage, onNavigate, collapsed, onToggleCollapsed }) => {
  const { user } = useAuth();
  const isCollapsed = collapsed;
  const [stats, setStats] = useState({ members: 0, online: 0, clips: 0 });
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [avatarByUsername, setAvatarByUsername] = useState({});
  const [unreadDMs, setUnreadDMs] = useState(0);

  useEffect(() => {
    if (!user || user.role === 'guest') { setUnreadDMs(0); return; }
    const refreshDMs = () => db.getUnreadDMCount(user.username).then(setUnreadDMs).catch(() => {});
    refreshDMs();
    const interval = setInterval(refreshDMs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    // db.getOnlineUsers() checks last_seen on the server, so it reflects
    // members active on ANY device — the previous version read
    // localStorage('nova_online') directly, which only ever contains
    // activity from this one browser, so other members never showed as
    // online here even while actively using the site elsewhere.
    const refresh = async () => {
      const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
      const memberCount = users.length + 1;
      const clips = JSON.parse(localStorage.getItem('nova_clips') || '[]');

      let online = [];
      try {
        online = await db.getOnlineUsers();
      } catch {
        const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
        const fiveMinAgo = Date.now() - 5 * 60 * 1000;
        online = Object.entries(onlineData)
          .filter(([, ts]) => ts > fiveMinAgo)
          .map(([username]) => username);
      }

      setStats({ members: memberCount, online: online.length, clips: clips.length });
      setOnlineMembers(online);
    };

    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  // Avatars for the online-members list — same profile-lookup pattern used
  // for DM avatars, refetched occasionally since who's online changes often.
  useEffect(() => {
    let cancelled = false;
    const loadAvatars = () => {
      db.getMemberProfiles().then((profiles) => {
        if (cancelled) return;
        const map = {};
        (profiles || []).forEach(p => { map[p.username] = p.avatar_url || null; });
        setAvatarByUsername(map);
      }).catch(() => {});
    };
    loadAvatars();
    const interval = setInterval(loadAvatars, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const quickLinks = [
    { id: 'leagues',     label: 'Leagues',          Icon: CircleDot },
    { id: 'feed',        label: 'Your Feed',        Icon: Rss },
    { id: 'articles',    label: 'Articles',         Icon: FileText },
    { id: 'tweets',      label: 'Tweets',           Icon: Twitter },
    { id: 'sports',      label: 'Sports',           Icon: Trophy },
    { id: 'games',       label: 'Games',            Icon: Gamepad2 },
    { id: 'music',       label: 'Music',            Icon: Music },
    { id: 'store',       label: 'Store',            Icon: Store },
    { id: 'members',     label: 'Member Pages',     Icon: Users },
    { id: 'staff',       label: 'Staff Directory',  Icon: Shield },
    { id: 'streaks',     label: 'Activity Streaks', Icon: Flame },
    { id: 'messages',    label: 'Messages',         Icon: MessageCircle },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-toggle"
        onClick={onToggleCollapsed}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      <div className="sidebar-section">
        {!isCollapsed && <h3>Quick Links</h3>}
        <div className="quick-links">
          {quickLinks.map((link) => {
            const active = currentPage === link.id;
            return (
              <button
                key={link.id}
                className={`quick-link ${active ? 'active' : ''}`}
                title={link.label}
                onClick={() => onNavigate(link.id)}
              >
                <span className="link-icon"><link.Icon size={16} strokeWidth={2.25} /></span>
                {!isCollapsed && <span className="link-label">{link.label}</span>}
                {link.id === 'messages' && unreadDMs > 0 && (
                  <span style={{
                    marginLeft: isCollapsed ? 0 : 'auto', minWidth: 16, height: 16, borderRadius: 8,
                    background: 'var(--color-magenta)', color: '#fff', fontSize: '0.6rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>{unreadDMs > 9 ? '9+' : unreadDMs}</span>
                )}
              </button>
            );
          })}
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
                <div className="member-avatar-wrap">
                  <div className="member-avatar">
                    {avatarByUsername[username]
                      ? <img src={avatarByUsername[username]} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : username.charAt(0).toUpperCase()}
                  </div>
                  <div className="online-status"></div>
                </div>
                {!isCollapsed && <span className="member-name">{username}</span>}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-section">
        {!isCollapsed && <h3>Stats</h3>}
        <div className="stats">
          <div className="stat-item">
            <span className="stat-icon"><Users size={15} strokeWidth={2.25} /></span>
            {!isCollapsed && (
              <>
                <span className="stat-label">Members</span>
                <span className="stat-value">{stats.members}</span>
              </>
            )}
          </div>
          <div className="stat-item">
            <span className="stat-icon" style={{ color: '#5ee6a8' }}><CircleDot size={15} strokeWidth={2.25} /></span>
            {!isCollapsed && (
              <>
                <span className="stat-label">Online</span>
                <span className="stat-value">{stats.online}</span>
              </>
            )}
          </div>
          <div className="stat-item">
            <span className="stat-icon"><Film size={15} strokeWidth={2.25} /></span>
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
