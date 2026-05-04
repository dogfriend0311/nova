import React, { useEffect, useState } from 'react';
import { SPORT_ICONS, SPORT_SHORT, getTeamLogoUrl } from '../../data/teams';
import { getWatchList } from '../../services/mediaService';
import './Pages.css';

const SPORT_KEYS = ['mlb', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'];
const TYPE_ICONS = { anime: '🎌', movie: '🎬', tv: '📺' };
const STATUS_COLORS = { plan: '#64b5f6', watching: '#66bb6a', watched: '#a5d6a7', dropped: '#ef9a9a' };
const STATUS_LABELS = { plan: 'Plan to Watch', watching: 'Watching', watched: 'Watched', dropped: 'Dropped' };

const roleLabel = (role) => {
  const map = { owner: 'Owner', cofounder: 'Co-Founder', mod: 'Moderator', nabb_helper: 'NABB Helper', member: 'Member' };
  return map[role] || 'Member';
};

const roleBadgeStyle = (role) => {
  const styles = {
    owner:       { background: 'rgba(255,215,0,0.15)',   border: '1px solid rgba(255,215,0,0.4)',   color: '#ffd700' },
    cofounder:   { background: 'rgba(255,100,0,0.15)',   border: '1px solid rgba(255,100,0,0.4)',   color: '#ff6400' },
    mod:         { background: 'rgba(0,200,100,0.15)',   border: '1px solid rgba(0,200,100,0.4)',   color: '#00c864' },
    nabb_helper: { background: 'rgba(150,0,255,0.15)',   border: '1px solid rgba(150,0,255,0.4)',   color: '#9600ff' },
  };
  return styles[role] || { background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.3)', color: 'var(--color-cyan)' };
};

/* ── Fav Teams Display ─────────────────────────────────────── */
const FavTeams = ({ favTeams }) => {
  const hasSome = SPORT_KEYS.some((s) => (favTeams?.[s] || []).length > 0);
  if (!hasSome) return null;
  return (
    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px 16px', marginTop: '14px' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        ⭐ Favorite Teams
      </div>
      {SPORT_KEYS.map((sport) => {
        const picked = favTeams?.[sport] || [];
        if (!picked.length) return null;
        const hasLogos = ['mlb', 'nfl', 'nba', 'nhl'].includes(sport);
        return (
          <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '7px' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(192,208,255,0.38)', minWidth: '88px', flexShrink: 0 }}>
              {SPORT_ICONS[sport]} {SPORT_SHORT[sport]}
            </span>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {picked.map((abbr) => {
                const logo = hasLogos ? getTeamLogoUrl(sport, abbr) : null;
                return (
                  <span key={abbr} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 9px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800',
                    background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.3)', color: '#00c8ff',
                    letterSpacing: '0.04em',
                  }}>
                    {logo && (
                      <img
                        src={logo}
                        alt=""
                        style={{ width: 15, height: 15, objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    {abbr}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Watch List Preview ────────────────────────────────────── */
const WatchPreview = ({ username }) => {
  const list = getWatchList(username);
  if (!list.length) return null;

  const pinned   = list.filter((i) => i.pinned);
  const watched  = list.filter((i) => i.status === 'watched').length;
  const watching = list.filter((i) => i.status === 'watching').length;
  const plan     = list.filter((i) => i.status === 'plan').length;

  const recentReviews = list
    .filter((i) => i.review || i.rating != null)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3);

  return (
    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px 16px', marginTop: '14px' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        🎬 Watch List
      </div>
      <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ color: '#a5d6a7' }}>✓ {watched} watched</span>
        <span style={{ color: '#66bb6a' }}>▶ {watching} watching</span>
        <span style={{ color: '#64b5f6' }}>📋 {plan} planned</span>
      </div>

      {pinned.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(192,208,255,0.3)', marginBottom: '6px' }}>📌 Pinned</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {pinned.slice(0, 6).map((item) => (
              <div key={item.id} style={{
                width: '52px', height: '74px', borderRadius: '6px', overflow: 'hidden', position: 'relative',
                background: 'rgba(20,20,50,0.8)', border: '1px solid rgba(100,120,200,0.25)', flexShrink: 0,
              }} title={item.title}>
                {item.poster
                  ? <img src={item.poster} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', opacity: 0.5 }}>{TYPE_ICONS[item.type]}</div>
                }
                {item.rating != null && (
                  <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.8)', color: '#fbbf24', fontSize: '0.6rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px' }}>
                    ★{item.rating}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {recentReviews.length > 0 && (
        <div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(192,208,255,0.3)', marginBottom: '6px' }}>Recent Reviews</div>
          {recentReviews.map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(100,120,200,0.08)', paddingBottom: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'rgba(192,208,255,0.85)' }}>{item.title}</span>
                {item.rating != null && <span style={{ color: '#fbbf24', fontSize: '0.78rem' }}>★ {item.rating}/10</span>}
                <span style={{ background: `${STATUS_COLORS[item.status]}1a`, color: STATUS_COLORS[item.status], border: `1px solid ${STATUS_COLORS[item.status]}44`, padding: '1px 7px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 700 }}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
              {item.review && (
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(192,208,255,0.55)', lineHeight: 1.4, fontStyle: 'italic' }}>
                  "{item.review.length > 100 ? item.review.slice(0, 100) + '…' : item.review}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Member List ───────────────────────────────────────────── */
const MemberPages = () => {
  const [members, setMembers]               = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch]                 = useState('');

  useEffect(() => {
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const users    = JSON.parse(localStorage.getItem('nova_users')       || '[]');
    setMembers(profiles.map((p) => ({ ...p, role: users.find((u) => u.username === p.username)?.role || 'member' })));
  }, []);

  if (selectedMember) {
    return <MemberProfileView member={selectedMember} onBack={() => setSelectedMember(null)} />;
  }

  const filtered = members.filter((m) =>
    m.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page members-page">
      <div className="page-header">
        <h1 className="gradient-text">Member Pages</h1>
        <p className="subtitle">Explore member profiles across Nova</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '400px' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="neon-card p-3" style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(192,208,255,0.5)' }}>
            {members.length === 0 ? 'No member profiles yet' : 'No members match your search'}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((member, i) => (
            <div key={i} className="neon-card" style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={() => setSelectedMember(member)}>
              <div style={{
                height: '70px',
                background: member.top_banner_url ? `url(${member.top_banner_url}) center/cover` : 'linear-gradient(135deg, #0d1b2e 0%, #001a2e 50%, #0d1229 100%)',
                position: 'relative'
              }} />
              <div style={{ padding: '0 16px 16px', position: 'relative' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-cyan), var(--color-magenta))',
                  border: '4px solid #1a1d2e', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '26px', marginTop: '-30px',
                  overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,255,255,0.2)'
                }}>
                  {member.avatar_url ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🚀'}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>{member.username}</h4>
                    <span style={{ ...roleBadgeStyle(member.role), padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {roleLabel(member.role)}
                    </span>
                  </div>
                  {member.bio && (
                    <p style={{ margin: '8px 0 0 0', color: 'rgba(192,208,255,0.65)', fontSize: '0.85rem', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {member.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Member Profile View ───────────────────────────────────── */
const MemberProfileView = ({ member, onBack }) => {
  const users      = JSON.parse(localStorage.getItem('nova_users') || '[]');
  const userRecord = users.find((u) => u.username === member.username);
  const role       = userRecord?.role || member.role || 'member';

  const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
  const isOnline   = onlineData[member.username] > Date.now() - 5 * 60 * 1000;

  const socials = [
    { key: 'twitter_url',   label: 'Twitter',   icon: '🐦' },
    { key: 'twitch_url',    label: 'Twitch',    icon: '🎮' },
    { key: 'youtube_url',   label: 'YouTube',   icon: '▶️' },
    { key: 'instagram_url', label: 'Instagram', icon: '📸' },
  ].filter((s) => member[s.key]);

  return (
    <div className="page" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <button className="neon-button" style={{ marginBottom: '20px', fontSize: '0.9rem' }} onClick={onBack}>
        ← Back to Members
      </button>

      <div style={{
        width: '100%', height: '200px', borderRadius: '12px 12px 0 0',
        background: member.top_banner_url ? `url(${member.top_banner_url}) center/cover` : 'linear-gradient(135deg, #0d1b2e 0%, #001a2e 50%, #0d1229 100%)'
      }} />

      <div style={{
        background: '#1a1d2e', border: '1px solid rgba(0,255,255,0.12)', borderTop: 'none',
        borderRadius: '0 0 12px 12px', padding: '60px 20px 24px 20px', position: 'relative'
      }}>
        <div style={{
          width: '90px', height: '90px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-cyan), var(--color-magenta))',
          border: '5px solid #1a1d2e', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '40px', position: 'absolute',
          top: '-45px', left: '20px', overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,255,255,0.25)'
        }}>
          {member.avatar_url ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🚀'}
        </div>

        <div style={{ position: 'absolute', top: '12px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: isOnline ? '#00ff00' : 'rgba(192,208,255,0.3)', boxShadow: isOnline ? '0 0 8px rgba(0,255,0,0.6)' : 'none', display: 'inline-block' }} />
          <span style={{ color: 'rgba(192,208,255,0.5)', fontSize: '0.8rem' }}>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: '700' }}>{member.username}</h2>
            <span style={{ ...roleBadgeStyle(role), padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {roleLabel(role)}
            </span>
          </div>
          {member.discord_tag && (
            <p style={{ color: 'rgba(192,208,255,0.4)', fontSize: '0.85rem', margin: '0 0 4px 0' }}>{member.discord_tag}</p>
          )}
        </div>

        {member.bio && (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px 16px', marginTop: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>About Me</div>
            <p style={{ margin: 0, color: 'rgba(192,208,255,0.9)', fontSize: '0.95rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{member.bio}</p>
          </div>
        )}

        <FavTeams favTeams={member.fav_teams} />

        <WatchPreview username={member.username} />

        {member.spotify_url && (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px 16px', marginTop: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>🎵 Listening To</div>
            <iframe title="Spotify" src={member.spotify_url.includes('/embed/') ? member.spotify_url : member.spotify_url.replace('open.spotify.com/', 'open.spotify.com/embed/')}
              width="100%" height="90" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media" style={{ borderRadius: '8px' }} />
          </div>
        )}

        {socials.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px 16px', marginTop: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Connections</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {socials.map((s) => (
                <a key={s.key} href={member[s.key]} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(192,208,255,0.85)', fontSize: '0.85rem', textDecoration: 'none', fontFamily: "'Space Mono', monospace" }}>
                  {s.icon} {s.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberPages;
