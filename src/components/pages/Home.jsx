import React, { useState, useEffect } from 'react';
import './Pages.css';
import './Home.css';
import ActivityFeed from '../ActivityFeed';
import RobloxGameStatusWidget from '../RobloxGameStatusWidget';

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
  articles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
      <path d="M7.5 8.5h9M7.5 12h9M7.5 15.5h5.5" />
    </svg>
  ),
};

/* Official Nova Discord invite */
const DISCORD_INVITE_URL = 'https://discord.gg/B2c7Gsks9p';

const DiscordMark = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
    <path d="M20.32 4.87A19.8 19.8 0 0 0 15.66 3.4a.07.07 0 0 0-.08.04c-.2.36-.43.83-.59 1.2a18.3 18.3 0 0 0-5.5 0 12 12 0 0 0-.6-1.2.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.66 1.47.07.07 0 0 0-.03.03C1.2 9.1.44 13.19.81 17.23a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 6 3.04.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-2a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.13c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08 0c3.93 1.8 8.18 1.8 12.06 0a.07.07 0 0 1 .08 0c.12.1.24.2.37.3a.08.08 0 0 1 0 .12c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.1c.37.72.78 1.39 1.23 2.01a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6.01-3.04.08.08 0 0 0 .03-.06c.44-4.67-.74-8.72-3.14-12.33a.06.06 0 0 0-.03-.03ZM8.68 14.8c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.41 2.15-2.41 1.21 0 2.17 1.09 2.15 2.41 0 1.32-.94 2.4-2.15 2.4Zm6.65 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.41 2.15-2.41 1.21 0 2.17 1.09 2.15 2.41 0 1.32-.93 2.4-2.15 2.4Z" />
  </svg>
);

/* Accent RGB triples matched to theme.css palette */
const ACCENTS = {
  blue:   '94, 129, 244',   // ion blue (primary)
  amber:  '255, 158, 87',   // solar flare (secondary)
  violet: '108, 92, 231',   // cosmic violet (rare)
};

const TILES = [
  { id: 'leagues',   icon: 'league',  title: 'Roblox Leagues', desc: 'Baseball, Hockey & Football — rosters, box scores, and player stat pages', accent: 'blue'   },
  { id: 'sports',    icon: 'sports',  title: 'Sports Hub',    desc: 'Live scores across MLB, NFL, NBA, and NHL',               accent: 'amber'  },
  { id: 'members',   icon: 'members', title: 'Members',       desc: 'Browse profiles and leave a comment',                     accent: 'blue'   },
  { id: 'games',     icon: 'games',   title: 'Games',         desc: 'Fantasy, Pick\'ems, Beat Battle, Prop Bets & more',       accent: 'amber'  },
  { id: 'music',     icon: 'music',   title: 'Music',         desc: '🎧 Last.fm scrobbles & Beat Battle',                       accent: 'violet' },
  { id: 'articles',  icon: 'articles',title: 'Articles',      desc: '📰 Sports & music writeups from the staff',                accent: 'blue'   },
  { id: 'coinshop',  icon: 'store',   title: 'Coin Shop',     desc: '🛍️ Buy name glows, avatar borders & badges',             accent: 'amber'  },
  { id: 'wrapped',   icon: 'profile', title: 'Nova Wrapped',  desc: '✨ Your monthly stats recap card',                        accent: 'violet' },
  { id: 'roblox',    icon: 'games',   title: 'Roblox Tracker','desc': '🎮 Link your Roblox account to your profile',           accent: 'blue'   },
  { id: 'profile',   icon: 'profile', title: 'My Profile',    desc: 'Edit your bio, teams, faves & cosmetics',                 accent: 'blue'   },
];

function getSongOfDay() {
  try { return JSON.parse(localStorage.getItem('nova_song_of_day') || 'null'); }
  catch { return null; }
}

function toSongEmbed(url) {
  if (!url) return null;
  if (url.includes('open.spotify.com') || url.includes('/embed/')) {
    const src = url.includes('/embed/') ? url : url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    return { type: 'spotify', src };
  }
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/);
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` };
  if (url.includes('music.apple.com')) {
    return { type: 'apple', src: url.replace('music.apple.com', 'embed.music.apple.com') };
  }
  return null;
}

const Home = ({ onNavigate, user }) => {
  const [stats, setStats] = useState({ members: 0, online: 0 });
  const [onlineList, setOnlineList] = useState([]);
  const [songOfDay, setSongOfDay] = useState(getSongOfDay);
  const [announcements, setAnnouncements] = useState([]);
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [staffOfMonth, setStaffOfMonth] = useState(null);

  useEffect(() => {
    let active = true;
    const loadAnnouncements = async () => {
      try {
        const { default: db } = await import('../../services/db');
        const list = await db.getAnnouncements();
        if (active) setAnnouncements(list);
      } catch {}
    };
    loadAnnouncements();
    const id = setInterval(loadAnnouncements, 60000);
    return () => { active = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    let active = true;
    const loadStaffOfMonth = async () => {
      try {
        const { default: db } = await import('../../services/db');
        const [sotm, profiles] = await Promise.all([db.getStaffOfMonth(), db.getMemberProfiles()]);
        if (!active) return;
        if (sotm?.username) {
          const profile = profiles.find((p) => p.username === sotm.username);
          setStaffOfMonth({ ...sotm, avatar_url: profile?.avatar_url, bio: profile?.bio });
        } else {
          setStaffOfMonth(null);
        }
      } catch {}
    };
    loadStaffOfMonth();
    const id = setInterval(loadStaffOfMonth, 60000);
    return () => { active = false; clearInterval(id); };
  }, []);

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

  useEffect(() => {
    const check = () => setSongOfDay(getSongOfDay());
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  const go = (pageId, sub) => {
    if (onNavigate) onNavigate(pageId, sub);
  };

  return (
    <div className="page home-page">
      <div className="home-hero">
        <h1 className="gradient-text">
          {user?.username ? `Welcome back, ${user.username}` : 'Welcome to Nova'}
        </h1>
        <p className="subtitle">Your hub for Roblox Baseball, Hockey & Football stats, live sports, and the community.</p>

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

      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noreferrer"
        className="home-discord-banner"
        aria-label="Join the Nova Discord server"
      >
        <span className="home-discord-banner-icon"><DiscordMark /></span>
        <span className="home-discord-banner-copy">
          <strong>Join the Nova Discord</strong>
          <span>Chat with the community, get live league updates &amp; more</span>
        </span>
        <span className="home-discord-banner-cta">Join Server &#8599;</span>
      </a>

      {staffOfMonth && (
        <div style={{ marginBottom: 20 }}>
          <div className="home-section-label">Staff of the Month</div>
          <div
            className="home-sotm-card"
            onClick={() => go('members', staffOfMonth.username)}
          >
            <div className="home-sotm-avatar">
              {staffOfMonth.avatar_url
                ? <img src={staffOfMonth.avatar_url} alt="" />
                : (staffOfMonth.username?.[0]?.toUpperCase() || '★')}
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div className="home-sotm-kicker">🌟 Staff of the Month{staffOfMonth.month_label ? ` — ${staffOfMonth.month_label}` : ''}</div>
              <div className="home-sotm-name">{staffOfMonth.username}</div>
              {staffOfMonth.note && <div className="home-sotm-note">{staffOfMonth.note}</div>}
            </div>
            <span className="home-sotm-arrow">&#8599;</span>
          </div>
        </div>
      )}

      {announcements.length > 0 && (
        <div className="neon-card p-3" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(158,165,196,0.4)' }}>
              📢 Site Updates
            </span>
            {announcements.length > 1 && (
              <button onClick={() => setShowAllUpdates(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', fontSize: '0.78rem' }}>
                {showAllUpdates ? 'Show less ▲' : `View all ${announcements.length} updates ▼`}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: showAllUpdates ? 360 : undefined, overflowY: showAllUpdates ? 'auto' : undefined }}>
            {(showAllUpdates ? announcements : announcements.slice(0, 1)).map((a) => (
              <div key={a.id} style={{ paddingBottom: 10, borderBottom: '1px solid rgba(94,129,244,0.1)' }}>
                <div style={{ fontSize: '0.88rem', color: '#e2e5f0', whiteSpace: 'pre-wrap' }}>{a.message}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.4)', marginTop: 6 }}>
                  {new Date(a.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {onlineList.length > 0 && (
        <>
          <div className="home-section-label">Online Now</div>
          <div className="home-online-strip">
            {onlineList.map((p) => (
              <div key={p.username} className="home-online-chip" onClick={() => go('members', p.username)}>
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

      {songOfDay && (() => {
        const embed = toSongEmbed(songOfDay.url);
        return (
          <div style={{ marginBottom: 8 }}>
            <div className="home-section-label">Song of the Day</div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(108,60,231,0.1), rgba(94,129,244,0.06))',
              border: '1px solid rgba(108,60,231,0.25)', borderRadius: 14,
              padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(158,165,196,0.4)', marginBottom: 4 }}>🎶 Admin Pick</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e2e5f0' }}>{songOfDay.title || 'Song of the Day'}</div>
                {songOfDay.artist && <div style={{ fontSize: '0.82rem', color: 'rgba(158,165,196,0.6)', marginTop: 2 }}>{songOfDay.artist}</div>}
                {songOfDay.description && <div style={{ fontSize: '0.8rem', color: 'rgba(158,165,196,0.5)', marginTop: 6, lineHeight: 1.4 }}>{songOfDay.description}</div>}
                {songOfDay.url && !embed && (
                  <a href={songOfDay.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 10, fontSize: '0.8rem', color: 'var(--color-cyan)', textDecoration: 'none' }}>
                    Listen ↗
                  </a>
                )}
              </div>
              {embed && (
                <div style={{ borderRadius: 10, overflow: 'hidden', flexShrink: 0, width: '100%', maxWidth: 340 }}>
                  <iframe
                    src={embed.src}
                    width="100%"
                    height={embed.type === 'spotify' ? 80 : 160}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen"
                    title="Song of the Day"
                    style={{ display: 'block' }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <RobloxGameStatusWidget />

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

      <ActivityFeed />
    </div>
  );
};

export default Home;
