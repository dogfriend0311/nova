import React, { useEffect, useState } from 'react';
import { SPORT_ICONS, SPORT_SHORT, getTeamLogoUrl } from '../../data/teams';
import * as lfm from '../../services/lastfmService';
import { ProfileBackground, ProfileAudioPlayer } from './MemberProfile';

// ── role helpers ──────────────────────────────────────────────
const SPORT_KEYS = ['mlb', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'];

const roleLabel = (role) => {
  const m = { owner: 'Owner', cofounder: 'Co-Founder', mod: 'Moderator', vizta_helper: 'Roblox Baseball Helper', member: 'Member' };
  return m[role] || 'Member';
};
const roleColor = (role) => {
  const m = {
    owner:        '#ffd700',
    cofounder:    '#ff6400',
    mod:          '#00c864',
    vizta_helper: '#cc66ff',
  };
  return m[role] || '#5e81f4';
};
const roleGlow = (role) => {
  const m = {
    owner:        'rgba(255,215,0,0.3)',
    cofounder:    'rgba(255,100,0,0.3)',
    mod:          'rgba(0,200,100,0.3)',
    vizta_helper: 'rgba(180,0,255,0.3)',
  };
  return m[role] || 'rgba(94,129,244,0.2)';
};

function copyToClipboard(text, setCopied) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }).catch(() => {});
}

function robloxThumbUrl(placeId) {
  return `https://wsrv.nl/?url=${encodeURIComponent(
    `https://www.roblox.com/Thumbs/GameIcon.ashx?placeId=${placeId}&width=256&height=256`
  )}&w=64&h=64`;
}

// ── Default gradient banners per role ─────────────────────────
const defaultBanner = (role) => {
  const m = {
    owner:        'linear-gradient(135deg,#1a0a00 0%,#3d1f00 40%,#1a0a00 100%)',
    cofounder:    'linear-gradient(135deg,#1a0500 0%,#2d1200 40%,#1a0500 100%)',
    mod:          'linear-gradient(135deg,#001a0d 0%,#003319 40%,#001a0d 100%)',
    vizta_helper: 'linear-gradient(135deg,#12003d 0%,#230066 40%,#12003d 100%)',
  };
  return m[role] || 'linear-gradient(135deg,#070b1a 0%,#0d1535 40%,#070b1a 100%)';
};

// ── Fav Teams ─────────────────────────────────────────────────
const FavTeams = ({ favTeams }) => {
  const hasSome = SPORT_KEYS.some(s => (favTeams?.[s] || []).length > 0);
  if (!hasSome) return null;
  return (
    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '14px 16px', marginTop: 14 }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(158,165,196,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
        ★ Favorite Teams
      </div>
      {SPORT_KEYS.map(sport => {
        const picked = favTeams?.[sport] || [];
        if (!picked.length) return null;
        const hasLogos = ['mlb','nfl','nba','nhl'].includes(sport);
        return (
          <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.38)', minWidth: 88, flexShrink: 0 }}>
              {SPORT_ICONS[sport]} {SPORT_SHORT[sport]}
            </span>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {picked.map(abbr => {
                const logo = hasLogos ? getTeamLogoUrl(sport, abbr) : null;
                return (
                  <span key={abbr} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 800, background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.3)', color: '#5e81f4', letterSpacing: '0.04em' }}>
                    {logo && <img src={logo} alt="" style={{ width: 15, height: 15, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />}
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

// ── Now Playing (public) ──────────────────────────────────────
const NowPlayingPublic = ({ lastfmUsername }) => {
  const [track, setTrack] = useState(null);
  useEffect(() => {
    if (!lastfmUsername || !lfm.hasApiKey()) return;
    let active = true;
    const poll = async () => { const t = await lfm.getNowPlaying(lastfmUsername); if (active) setTrack(t); };
    poll();
    const id = setInterval(poll, 30000);
    return () => { active = false; clearInterval(id); };
  }, [lastfmUsername]);
  if (!track) return null;
  return (
    <a href={track.trackUrl || `https://www.last.fm/user/${lastfmUsername}`} target="_blank" rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(213,16,7,0.07)', border: '1px solid rgba(213,16,7,0.25)', borderRadius: 10, textDecoration: 'none', marginBottom: 14 }}>
      {track.albumArt
        ? <img src={track.albumArt} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 44, height: 44, borderRadius: 6, background: 'rgba(213,16,7,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>♪</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.68rem', color: '#d51007', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d51007', display: 'inline-block' }} />
          {track.isPlaying ? 'Listening Now' : 'Last Played'}
        </div>
        <div style={{ fontWeight: 700, color: '#e8efff', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.trackName}</div>
        <div style={{ fontSize: '0.76rem', color: 'rgba(158,165,196,0.5)' }}>{track.artistName}</div>
      </div>
    </a>
  );
};

// ── Comments ──────────────────────────────────────────────────
const CommentsSection = ({ toUsername, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [posting, setPosting]   = useState(false);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { db } = await import('../../services/db');
      const data = await db.getComments(toUsername);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      setComments(all[toUsername] || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadComments(); }, [toUsername]); // eslint-disable-line

  const handlePost = async () => {
    if (!text.trim() || !currentUser) return;
    setPosting(true);
    const nc = { id: Date.now().toString(), from_username: currentUser, to_username: toUsername, content: text.trim(), created_at: new Date().toISOString() };
    try {
      const { db } = await import('../../services/db');
      const saved = await db.addComment(nc);
      setComments(p => [saved || nc, ...p]);
    } catch {
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      all[toUsername] = [nc, ...(all[toUsername] || [])];
      localStorage.setItem('nova_comments', JSON.stringify(all));
      setComments(p => [nc, ...p]);
    }
    setText(''); setPosting(false);
  };

  const handleDelete = async (commentId, fromUsername) => {
    if (currentUser !== fromUsername && currentUser !== toUsername) return;
    try { const { db } = await import('../../services/db'); await db.deleteComment(commentId); } catch {
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      all[toUsername] = (all[toUsername] || []).filter(c => c.id !== commentId);
      localStorage.setItem('nova_comments', JSON.stringify(all));
    }
    setComments(p => p.filter(c => c.id !== commentId));
  };

  const timeAgo = iso => {
    if (!iso) return '';
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <div style={{ padding: '20px 0' }}>
      {currentUser ? (
        <div style={{ marginBottom: 20 }}>
          <textarea rows={2} placeholder={`Leave a comment on ${toUsername}'s profile...`} value={text}
            onChange={e => setText(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          <button className="neon-button" onClick={handlePost} disabled={posting || !text.trim()}
            style={{ marginTop: 8, padding: '8px 20px', opacity: (!text.trim() || posting) ? 0.4 : 1 }}>
            {posting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      ) : (
        <p style={{ color: 'rgba(158,165,196,0.4)', fontSize: '0.85rem', marginBottom: 16 }}>Sign in to leave a comment.</p>
      )}

      {loading ? (
        <p style={{ color: 'rgba(158,165,196,0.3)', fontSize: '0.85rem' }}>Loading comments…</p>
      ) : comments.length === 0 ? (
        <p style={{ color: 'rgba(158,165,196,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No comments yet. Be the first!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding: '12px 14px', background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.88rem' }}>{c.from_username}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.72rem' }}>{timeAgo(c.created_at)}</span>
                  {(currentUser === c.from_username || currentUser === toUsername) && (
                    <button onClick={() => handleDelete(c.id, c.from_username)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,107,122,0.5)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <p style={{ margin: 0, color: 'rgba(220,230,255,0.85)', fontSize: '0.88rem', lineHeight: 1.5 }}>{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── guns.lol-style Member Card ────────────────────────────────
const MemberCard = ({ member, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const rc = roleColor(member.role);
  const rg = roleGlow(member.role);
  const hasBanner = !!member.top_banner_url;
  const hasAvatar = !!member.avatar_url;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${hovered ? rc : 'rgba(255,255,255,0.06)'}`,
        background: '#0d1024',
        boxShadow: hovered
          ? `0 8px 32px ${rg}, 0 0 0 1px ${rc}22`
          : '0 2px 12px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-4px) scale(1.01)' : 'none',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
      }}
    >
      {/* Banner */}
      <div style={{
        height: 120,
        background: hasBanner
          ? `url(${member.top_banner_url}) center/cover no-repeat`
          : defaultBanner(member.role),
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle overlay gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 50%, rgba(13,16,36,0.85) 100%)',
        }} />

        {/* Role badge top-right */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          padding: '3px 10px', borderRadius: 20,
          background: `${rc}18`,
          border: `1px solid ${rc}55`,
          color: rc,
          fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
          backdropFilter: 'blur(6px)',
        }}>
          {roleLabel(member.role)}
        </div>
      </div>

      {/* Avatar — overlapping banner */}
      <div style={{ padding: '0 16px 16px', position: 'relative' }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: '50%',
          border: `3px solid ${rc}`,
          boxShadow: `0 0 0 2px #0d1024, 0 0 12px ${rg}`,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${rc}44, #0d1024)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem',
          marginTop: -32,
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
        }}>
          {hasAvatar
            ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: rc, fontWeight: 900, fontSize: '1.4rem', fontFamily: 'var(--font-display)' }}>
                {(member.username?.[0] || '?').toUpperCase()}
              </span>
          }
        </div>

        {/* Name + bio */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {member.username}
            {member.role === 'owner' && <span style={{ fontSize: '0.75rem' }}>👑</span>}
            {member.role === 'mod'   && <span style={{ fontSize: '0.75rem' }}>🛡️</span>}
          </div>
          {member.bio ? (
            <p style={{
              margin: '6px 0 0', color: 'rgba(200,210,240,0.55)',
              fontSize: '0.78rem', lineHeight: 1.4,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {member.bio}
            </p>
          ) : (
            <p style={{ margin: '6px 0 0', color: 'rgba(158,165,196,0.25)', fontSize: '0.78rem', fontStyle: 'italic' }}>
              No bio set
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Member List ───────────────────────────────────────────────
const MemberPages = ({ targetUsername, onMemberSelect }) => {
  const [members,        setMembers]        = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [search,         setSearch]         = useState('');
  const [roleFilter,     setRoleFilter]     = useState('all');
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    import('../../services/db').then(({ default: db }) => {
      Promise.all([db.getMemberProfiles(), db.getUsers()]).then(([profiles, users]) => {
        const enriched = profiles.map(p => ({
          ...p,
          role: users.find(u => u.username === p.username)?.role || p.role || 'member',
        }));
        // Sort: owner first, then cofounder, mod, vizta_helper, member
        const ORDER = { owner: 0, cofounder: 1, mod: 2, vizta_helper: 3, member: 4 };
        enriched.sort((a, b) => (ORDER[a.role] ?? 5) - (ORDER[b.role] ?? 5));
        setMembers(enriched);
        setLoading(false);
        if (targetUsername) {
          const found = enriched.find(m => m.username === targetUsername);
          if (found) setSelectedMember(found);
        }
      }).catch(() => {
        const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
        const users    = JSON.parse(localStorage.getItem('nova_users')       || '[]');
        const enriched = profiles.map(p => ({ ...p, role: users.find(u => u.username === p.username)?.role || 'member' }));
        setMembers(enriched);
        setLoading(false);
        if (targetUsername) {
          const found = enriched.find(m => m.username === targetUsername);
          if (found) setSelectedMember(found);
        }
      });
    });
  }, [targetUsername]);

  const handleSelect = (member) => {
    setSelectedMember(member);
    if (onMemberSelect) onMemberSelect(member.username);
  };

  const handleBack = () => {
    setSelectedMember(null);
    if (onMemberSelect) onMemberSelect(null);
  };

  if (selectedMember) return <MemberProfileView member={selectedMember} onBack={handleBack} />;

  const filtered = members.filter(m => {
    const ms = m.username?.toLowerCase().includes(search.toLowerCase());
    const mr = roleFilter === 'all' || (m.role || 'member') === roleFilter;
    return ms && mr;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 12px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '32px 0 36px' }}>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 900,
          background: 'linear-gradient(135deg, #e2e5f0 0%, #5e81f4 50%, #ff9e57 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          marginBottom: 8, letterSpacing: '-0.02em',
        }}>
          Member Pages
        </h1>
        <p style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.95rem' }}>
          {loading ? 'Loading…' : `${members.length} members in the Nova community`}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 340 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(158,165,196,0.35)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Search members…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.15)', color: '#e2e5f0', borderRadius: 10, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all','owner','cofounder','mod','vizta_helper','member'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '8px 14px', borderRadius: 20,
                border: `1px solid ${roleFilter === r ? (r === 'all' ? 'rgba(94,129,244,0.5)' : roleColor(r)) : 'rgba(94,129,244,0.12)'}`,
                background: roleFilter === r ? (r === 'all' ? 'rgba(94,129,244,0.12)' : `${roleColor(r)}12`) : 'transparent',
                color: roleFilter === r ? (r === 'all' ? 'var(--color-cyan)' : roleColor(r)) : 'rgba(158,165,196,0.45)',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize',
                transition: 'all 0.15s', whiteSpace: 'nowrap', minHeight: 36,
              }}
            >
              {r === 'all' ? 'All' : roleLabel(r)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(94,129,244,0.2)', borderTopColor: 'var(--color-cyan)', borderRadius: '50%', animation: 'rotate 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.88rem' }}>Loading members…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="neon-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 10 }}>👤</div>
          <p style={{ color: 'rgba(158,165,196,0.4)', margin: 0 }}>
            {members.length === 0 ? 'No member profiles yet' : 'No members match your search'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {filtered.map((member, i) => (
            <MemberCard key={member.username || i} member={member} onClick={() => handleSelect(member)} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Member Profile View (improved) ────────────────────────────
const MemberProfileView = ({ member, onBack }) => {
  const users      = JSON.parse(localStorage.getItem('nova_users') || '[]');
  const userRecord = users.find(u => u.username === member.username);
  const role       = userRecord?.role || member.role || 'member';
  const rc         = roleColor(role);
  const rg         = roleGlow(role);

  const savedUser   = JSON.parse(localStorage.getItem('nova_user') || 'null');
  const currentUser = savedUser?.username || null;

  const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
  const isOnline   = onlineData[member.username] > Date.now() - 5 * 60 * 1000;

  const [viewTab, setViewTab] = useState('about');
  const [copied,  setCopied]  = useState(false);
  const [bannerLoaded, setBannerLoaded] = useState(false);

  const favGames       = member.fav_games || [];
  const presenceStatus = localStorage.getItem(`nova_presence_${member.username}`) || 'online';
  const presenceDot    = presenceStatus === 'online' ? '#43b581' : presenceStatus === 'idle' ? '#f04747' : '#747f8d';
  const presenceTxt    = isOnline
    ? (presenceStatus === 'online' ? 'Online' : presenceStatus === 'idle' ? 'Do Not Disturb' : 'Invisible')
    : 'Offline';

  const socials = [
    { key: 'twitter_url',   label: 'Twitter',   icon: '𝕏', color: '#e2e5f0' },
    { key: 'twitch_url',    label: 'Twitch',    icon: '🎮', color: '#9146ff' },
    { key: 'youtube_url',   label: 'YouTube',   icon: '▶',  color: '#ff0000' },
    { key: 'instagram_url', label: 'Instagram', icon: '📸', color: '#e4405f' },
  ].filter(s => member[s.key]);

  const VTABS = [
    { id: 'about',       label: 'About'        },
    { id: 'music',       label: '🎵 Music'     },
    { id: 'favgames',    label: 'Fav Games'    },
    { id: 'robloxgames', label: 'Roblox'       },
    { id: 'teams',       label: '🏆 Teams'     },
    { id: 'comments',    label: '💬 Comments'  },
  ];

  const shareUrl = `${window.location.origin}${window.location.pathname}#members/${member.username}`;

  const robloxGames = favGames.filter(g => g.placeId);
  const sportsGames = favGames.filter(g => !g.placeId);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 60 }}>
      {member.bg_media_url && (
        <ProfileBackground url={member.bg_media_url} type={member.bg_media_type} />
      )}
      {member.audio_url && (
        <ProfileAudioPlayer url={member.audio_url} title={member.audio_title} />
      )}

      {/* Back + share row */}
      <div style={{ display: 'flex', gap: 10, padding: '0 12px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={onBack}
          style={{ padding: '9px 18px', background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.25)', color: 'rgba(158,165,196,0.8)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.83rem', minHeight: 40 }}>
          ← Back
        </button>
        <button onClick={() => copyToClipboard(shareUrl, setCopied)}
          style={{ padding: '9px 16px', background: copied ? 'rgba(0,255,136,0.07)' : 'rgba(94,129,244,0.06)', border: `1px solid ${copied ? 'rgba(0,255,136,0.4)' : 'rgba(94,129,244,0.18)'}`, color: copied ? '#00ff88' : 'rgba(158,165,196,0.5)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', minHeight: 40, transition: 'all 0.2s' }}>
          {copied ? '✓ Copied!' : '🔗 Share'}
        </button>
      </div>

      {/* Banner */}
      <div style={{
        width: '100%', height: 200, position: 'relative', overflow: 'hidden',
        background: member.top_banner_url ? (bannerLoaded ? `url(${member.top_banner_url}) center/cover no-repeat` : defaultBanner(role)) : defaultBanner(role),
      }}>
        {member.top_banner_url && (
          <img src={member.top_banner_url} alt="" style={{ display: 'none' }} onLoad={() => setBannerLoaded(true)} />
        )}
        {/* Bottom fade */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, #0a0d1a 100%)' }} />
        {/* Subtle scanlines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.08), rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px)', pointerEvents: 'none' }} />
      </div>

      {/* Avatar area */}
      <div style={{ padding: '0 20px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            border: `4px solid ${rc}`,
            boxShadow: `0 0 0 3px #0a0d1a, 0 0 20px ${rg}`,
            background: `linear-gradient(135deg, ${rc}33, rgba(10,13,26,0.9))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', marginTop: -48, flexShrink: 0, position: 'relative', zIndex: 1,
          }}>
            {member.avatar_url
              ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: rc, fontWeight: 900, fontSize: '2rem', fontFamily: 'var(--font-display)' }}>
                  {(member.username?.[0] || '?').toUpperCase()}
                </span>
            }
          </div>

          {/* Social links top-right */}
          {socials.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 4 }}>
              {socials.map(s => (
                <a key={s.key} href={member[s.key]} target="_blank" rel="noreferrer"
                  style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}14`, border: `1px solid ${s.color}35`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '0.9rem', transition: 'all 0.15s' }}>
                  {s.icon}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Name / role / presence */}
        <div style={{ marginTop: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
              {member.username}
            </h2>
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              background: `${rc}15`, border: `1px solid ${rc}50`,
              color: rc, fontSize: '0.65rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {roleLabel(role)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? presenceDot : 'rgba(158,165,196,0.25)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'rgba(158,165,196,0.45)', fontSize: '0.78rem' }}>{presenceTxt}</span>
          </div>

          {member.bio && (
            <p style={{ color: 'rgba(210,220,245,0.85)', fontSize: '0.93rem', lineHeight: 1.6, margin: '0 0 12px' }}>
              {member.bio}
            </p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', scrollbarWidth: 'none', margin: '4px 0 0' }}>
        {VTABS.map(t => (
          <button key={t.id} onClick={() => setViewTab(t.id)}
            style={{ flex: 1, minWidth: 70, padding: '13px 8px', background: 'none', border: 'none', borderBottom: viewTab === t.id ? `2px solid ${rc}` : '2px solid transparent', color: viewTab === t.id ? '#e7e9ea' : 'rgba(158,165,196,0.45)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.18s', minHeight: 44 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '0 20px' }}>
        {viewTab === 'about' && (
          <div style={{ padding: '20px 0' }}>
            {member.bio
              ? <p style={{ color: 'rgba(158,165,196,0.85)', lineHeight: 1.7, margin: 0 }}>{member.bio}</p>
              : <p style={{ color: 'rgba(158,165,196,0.25)', textAlign: 'center', padding: '30px 0', fontStyle: 'italic' }}>No bio set yet.</p>
            }
          </div>
        )}

        {viewTab === 'music' && (
          <div style={{ padding: '20px 0' }}>
            {member.lastfm_username && <NowPlayingPublic lastfmUsername={member.lastfm_username} />}
            {member.spotify_url && (
              <iframe title="Spotify"
                src={member.spotify_url.includes('/embed/') ? member.spotify_url : member.spotify_url.replace('open.spotify.com/', 'open.spotify.com/embed/')}
                width="100%" height="80" frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                style={{ borderRadius: 10, display: 'block' }}
              />
            )}
            {!member.lastfm_username && !member.spotify_url && (
              <p style={{ color: 'rgba(158,165,196,0.25)', textAlign: 'center', padding: 30, fontStyle: 'italic' }}>No music linked.</p>
            )}
          </div>
        )}

        {viewTab === 'favgames' && (
          <div style={{ padding: '20px 0' }}>
            {sportsGames.length === 0
              ? <p style={{ color: 'rgba(158,165,196,0.25)', textAlign: 'center', padding: 30, fontStyle: 'italic' }}>No favorite games yet.</p>
              : sportsGames.map(g => (
                  <div key={g.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.95rem' }}>{g.text}</p>
                    {g.note && <p style={{ margin: 0, color: 'rgba(158,165,196,0.6)', fontSize: '0.83rem' }}>"{g.note}"</p>}
                  </div>
                ))
            }
          </div>
        )}

        {viewTab === 'robloxgames' && (
          <div style={{ padding: '20px 0' }}>
            {robloxGames.length === 0
              ? <p style={{ color: 'rgba(158,165,196,0.25)', textAlign: 'center', padding: 30, fontStyle: 'italic' }}>No Roblox games added yet.</p>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                  {robloxGames.map(g => (
                    <div key={g.id} style={{ background: 'rgba(94,129,244,0.04)', border: '1px solid rgba(94,129,244,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                      <img src={robloxThumbUrl(g.placeId)} alt={g.text} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display='none'; }} />
                      <div style={{ padding: '6px 8px' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.text}</p>
                        {g.note && <p style={{ margin: 0, color: 'rgba(158,165,196,0.5)', fontSize: '0.7rem', fontStyle: 'italic' }}>"{g.note}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {viewTab === 'teams' && (
          <div style={{ padding: '20px 0' }}>
            <FavTeams favTeams={member.fav_teams} />
          </div>
        )}

        {viewTab === 'comments' && (
          <CommentsSection toUsername={member.username} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};

export default MemberPages;
