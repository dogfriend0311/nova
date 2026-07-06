import React, { useState, useEffect } from 'react';
import './Pages.css';
import './Home.css';

/* Tile icons (inline SVG - no emoji, renders identically everywhere) */
const Icon = {
  league: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9M12 3c-2.5 2.5-3.8 5.6-3.8 9s1.3 6.5 3.8 9M3.5 9h17M3.5 15h17" />
    </svg>
  ),
  sports: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  ),
  members: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M15.5 14.2c2.6.4 4.5 2.3 4.5 5.3" />
    </svg>
  ),
  watch: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="13" rx="2" />
      <path d="M9.5 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
    </svg>
  ),
  music: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </svg>
  ),
  games: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="7.5" width="19" height="10" rx="4" />
      <path d="M7 10.5v4M5 12.5h4" />
      <circle cx="16" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="18.2" cy="13.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  store: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9l1.2-4.5h13.6L20 9" />
      <path d="M4 9h16v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V9z" />
      <path d="M9 13a3 3 0 0 0 6 0" />
    </svg>
  ),
  profile: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" />
    </svg>
  ),
};

/* Accent RGB triples matched to theme.css palette */
const ACCENTS = {
  blue:   '94, 129, 244',   // ion blue (primary)
  amber:  '255, 158, 87',   // solar flare (secondary)
  violet: '108, 92, 231',   // cosmic violet (rare)
};

const TILES = [
  { id: 'leagues',   icon: 'league',  title: 'Vizta League',  desc: 'Rosters, box scores, and player stat pages',        accent: 'blue'   },
  { id: 'sports',    icon: 'sports',  title: 'Sports Hub',    desc: 'Live scores across MLB, NFL, NBA, and NHL',         accent: 'amber'  },
  { id: 'members',   icon: 'members', title: 'Members',       desc: 'Browse profiles and leave a comment',               accent: 'blue'   },
  { id: 'watchlist', icon: 'watch',   title: 'Watch List',    desc: 'Track anime, movies, and TV - rate & review',       accent: 'violet' },
  { id: 'lastfm',    icon: 'music',   title: 'Last.fm',       desc: 'Your scrobbles, top artists, and now playing',      accent: 'amber'  },
  { id: 'games',     icon: 'games',   title: 'Games',         desc: 'Road to the Show - build your baseball career',    accent: 'blue'   },
  { id: 'store',     icon: 'store',   title: 'Store',         desc: 'Spend your coins - coming soon',                    accent: 'violet' },
  { id: 'profile',   icon: 'profile', title: 'My Profile',    desc: 'Edit your bio, teams, and favorites',               accent: 'amber'  },
];

const Home = ({ onNavigate, user }) => {
  const [stats, setStats] = useState({ members: 0, online: 0 });
  const [onlineList, setOnlineList] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { default: db } = await import('../../services/db');
        const [profiles, onlineUsernames] = await Promise.all([
          db.getMemberProfiles(),
          db.getOnlineUsers(),
        ]);
        if (!active) return;
        setStats({ members: profiles.length, online: onlineUsernames.length });
        setOnlineList(
          onlineUsernames
            .map((uname) => profiles.find((p) => p.username === uname) || { username: uname })
            .slice(0, 12)
        );
      } catch {
        // Fallback to localStorage-only counts if Supabase isn't reachable
        const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
        const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
        const fiveMinAgo = Date.now() - 5 * 60 * 1000;
        const online = Object.keys(onlineData).filter((u) => onlineData[u] > fiveMinAgo);
        if (!active) return;
        setStats({ members: users.length + 1, online: online.length });
        setOnlineList(online.slice(0, 12).map((username) => ({ username })));
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const go = (pageId) => {
    if (onNavigate) onNavigate(pageId);
  };

  return (
    <div className="page home-page">
      <div className="home-hero">
        <h1 className="gradient-text">
          {user?.username ? `Welcome back, ${user.username}` : 'Welcome to Nova'}
        </h1>
        <p className="subtitle">Your hub for Vizta League stats, live sports, and the community.</p>

        <div className="home-stat-row">
          <span className="home-stat-pill">
            <span className="home-stat-dot" />
            <strong>{stats.online}</strong>&nbsp;online now
          </span>
          <span className="home-stat-pill">
            <strong>{stats.members}</strong>&nbsp;members
          </span>
        </div>
      </div>

      {onlineList.length > 0 && (
        <>
          <div className="home-section-label">Online Now</div>
          <div className="home-online-strip">
            {onlineList.map((p) => (
              <div key={p.username} className="home-online-chip" onClick={() => go('members')}>
                <div className="home-online-avatar">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" />
                    : p.username?.[0]?.toUpperCase()}
                </div>
                <span className="home-online-name">{p.username}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="home-section-label">Explore</div>
      <div className="home-tile-grid">
        {TILES.map((tile) => {
          const IconCmp = Icon[tile.icon];
          return (
            <button
              key={tile.id}
              className="home-tile"
              style={{ '--tile-rgb': ACCENTS[tile.accent] }}
              onClick={() => go(tile.id)}
            >
              <span className="home-tile-arrow">&#8599;</span>
              <div className="home-tile-icon"><IconCmp /></div>
              <h3 className="home-tile-title">{tile.title}</h3>
              <p className="home-tile-desc">{tile.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Home;
