import React, { useEffect, useState } from 'react';
import { SPORT_ICONS, SPORT_SHORT, getTeamLogoUrl } from '../../data/teams';
import * as lfm from '../../services/lastfmService';

const SPORT_KEYS   = ['mlb', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'];
const TYPE_ICONS   = { anime: '🎌', movie: '🎬', tv: '📺' };
const STATUS_COLORS = { plan: '#64b5f6', watching: '#66bb6a', watched: '#a5d6a7', dropped: '#ef9a9a' };
const STATUS_LABELS = { plan: 'Plan to Watch', watching: 'Watching', watched: 'Watched', dropped: 'Dropped' };

// ── Helpers ───────────────────────────────────────────────────
const roleLabel = (role) => {
  const map = { owner: 'Owner', cofounder: 'Co-Founder', mod: 'Moderator', vizta_helper: 'Vizta Helper', member: 'Member' };
  return map[role] || 'Member';
};

const roleBadgeStyle = (role) => {
  const styles = {
    owner:        { background: 'rgba(255,215,0,0.15)',  border: '1px solid rgba(255,215,0,0.4)',  color: '#ffd700' },
    cofounder:    { background: 'rgba(255,100,0,0.15)',  border: '1px solid rgba(255,100,0,0.4)',  color: '#ff6400' },
    mod:          { background: 'rgba(0,200,100,0.15)',  border: '1px solid rgba(0,200,100,0.4)',  color: '#00c864' },
    vizta_helper: { background: 'rgba(180,0,255,0.15)',  border: '1px solid rgba(180,0,255,0.4)',  color: '#cc66ff' },
  };
  return styles[role] || { background: 'rgba(94, 129, 244,0.1)', border: '1px solid rgba(94, 129, 244,0.3)', color: 'var(--color-cyan)' };
};

// Roblox game thumbnail via wsrv.nl proxy (avoids CORS)
function robloxThumbUrl(placeId) {
  return `https://wsrv.nl/?url=${encodeURIComponent(
    `https://www.roblox.com/Thumbs/GameIcon.ashx?placeId=${placeId}&width=256&height=256`
  )}&w=64&h=64`;
}

// Copy a URL to clipboard with a brief toast
function copyToClipboard(text, setCopied) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }).catch(() => {});
}

// ── Fav Teams Display ─────────────────────────────────────────
const FavTeams = ({ favTeams }) => {
  const hasSome = SPORT_KEYS.some((s) => (favTeams?.[s] || []).length > 0);
  if (!hasSome) return null;
  return (
    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px 16px', marginTop: '14px' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(158, 165, 196,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        ★ Favorite Teams
      </div>
      {SPORT_KEYS.map((sport) => {
        const picked   = favTeams?.[sport] || [];
        if (!picked.length) return null;
        const hasLogos = ['mlb', 'nfl', 'nba', 'nhl'].includes(sport);
        return (
          <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '7px' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(158, 165, 196,0.38)', minWidth: '88px', flexShrink: 0 }}>
              {SPORT_ICONS[sport]} {SPORT_SHORT[sport]}
            </span>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {picked.map((abbr) => {
                const logo = hasLogos ? getTeamLogoUrl(sport, abbr) : null;
                return (
                  <span key={abbr} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '800', background: 'rgba(94, 129, 244,0.08)', border: '1px solid rgba(94, 129, 244,0.3)', color: '#5e81f4', letterSpacing: '0.04em' }}>
                    {logo && <img src={logo} alt="" style={{ width: 15, height: 15, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />}
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

// ── Fav Games Display ─────────────────────────────────────────
/* ── Sports Fav Games (no placeId) ─────────────────────────── */
const FavGames = ({ favGames }) => {
  const sports = (favGames || []).filter(g => !g.placeId);
  if (!sports.length) {
    return <p style={{ color: 'rgba(158, 165, 196,0.3)', textAlign: 'center', padding: '20px' }}>No favorite games yet.</p>;
  }
  return (
    <div>
      {sports.map((g) => (
        <div key={g.id} style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ margin: '0 0 3px', fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.95rem' }}>{g.text}</p>
          {g.note && <p style={{ margin: '0 0 3px', color: 'rgba(158, 165, 196,0.65)', fontSize: '0.85rem' }}>"{g.note}"</p>}
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(158, 165, 196,0.35)' }}>{g.date}</p>
        </div>
      ))}
    </div>
  );
};

/* ── Roblox Games grid (has placeId) ───────────────────────── */
const RobloxGames = ({ favGames }) => {
  const roblox = (favGames || []).filter(g => g.placeId);
  if (!roblox.length) {
    return <p style={{ color: 'rgba(158, 165, 196,0.3)', textAlign: 'center', padding: '20px' }}>No Roblox games added yet.</p>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
      {roblox.map((g) => (
        <div key={g.id} style={{ background: 'rgba(94, 129, 244,0.04)', border: '1px solid rgba(94, 129, 244,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
          <img
            src={robloxThumbUrl(g.placeId)}
            alt={g.text}
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div style={{ padding: '6px 8px' }}>
            <p style={{ margin: '0 0 2px', fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.text}</p>
            {g.note && <p style={{ margin: 0, color: 'rgba(158, 165, 196,0.5)', fontSize: '0.7rem', fontStyle: 'italic' }}>"{g.note}"</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Last.fm Now Playing (public) ───────────────────────────── */
const NowPlayingPublic = ({ lastfmUsername }) => {
  const [track, setTrack] = useState(null);

  useEffect(() => {
    if (!lastfmUsername || !lfm.hasApiKey()) return;
    let active = true;
    const poll = async () => {
      const t = await lfm.getNowPlaying(lastfmUsername);
      if (active) setTrack(t);
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { active = false; clearInterval(id); };
  }, [lastfmUsername]);

  if (!track) return null;

  return (
    <a
      href={track.trackUrl || `https://www.last.fm/user/${lastfmUsername}`}
      target="_blank" rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(213,16,7,0.07)', border: '1px solid rgba(213,16,7,0.25)', borderRadius: '10px', textDecoration: 'none', marginBottom: '14px' }}
    >
      {track.albumArt
        ? <img src={track.albumArt} alt="" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: '44px', height: '44px', borderRadius: '6px', background: 'rgba(213,16,7,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>&#127925;</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.68rem', color: '#d51007', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#d51007', animation: 'lfm-np-pulse 1.4s infinite' }} />
          {track.isPlaying ? 'Listening Now' : 'Last Played'}
        </div>
        <div style={{ fontWeight: 700, color: '#e8efff', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.trackName}</div>
        <div style={{ fontSize: '0.76rem', color: 'rgba(158, 165, 196,0.5)' }}>{track.artistName}</div>
      </div>
    </a>
  );
};

// ── Watch List Preview removed ─────────────────────────────────
// eslint-disable-next-line no-unused-vars
const WatchPreview = ({ username }) => {
  const list = [];
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
      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(158, 165, 196,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        🎬 Watch List
      </div>
      <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ color: '#a5d6a7' }}>✓ {watched} watched</span>
        <span style={{ color: '#66bb6a' }}>▶ {watching} watching</span>
        <span style={{ color: '#64b5f6' }}>📋 {plan} planned</span>
      </div>
      {pinned.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(158, 165, 196,0.3)', marginBottom: '6px' }}>📌 Pinned</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {pinned.slice(0, 6).map((item) => (
              <div key={item.id} style={{ width: '52px', height: '74px', borderRadius: '6px', overflow: 'hidden', position: 'relative', background: 'rgba(20,20,50,0.8)', border: '1px solid rgba(100,120,200,0.25)', flexShrink: 0 }} title={item.title}>
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
          <div style={{ fontSize: '0.7rem', color: 'rgba(158, 165, 196,0.3)', marginBottom: '6px' }}>Recent Reviews</div>
          {recentReviews.map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(100,120,200,0.08)', paddingBottom: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'rgba(158, 165, 196,0.85)' }}>{item.title}</span>
                {item.rating != null && <span style={{ color: '#fbbf24', fontSize: '0.78rem' }}>★ {item.rating}/10</span>}
                <span style={{ background: `${STATUS_COLORS[item.status]}1a`, color: STATUS_COLORS[item.status], border: `1px solid ${STATUS_COLORS[item.status]}44`, padding: '1px 7px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 700 }}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
              {item.review && (
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(158, 165, 196,0.55)', lineHeight: 1.4, fontStyle: 'italic' }}>
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

// ── Member List ───────────────────────────────────────────────
/* ── Comments Section ────────────────────────────────────────── */
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
      // fallback: localStorage
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      setComments(all[toUsername] || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComments(); }, [toUsername]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePost = async () => {
    if (!text.trim() || !currentUser) return;
    setPosting(true);
    const newComment = {
      id:            Date.now().toString(),
      from_username: currentUser,
      to_username:   toUsername,
      content:       text.trim(),
      created_at:    new Date().toISOString(),
    };
    try {
      const { db } = await import('../../services/db');
      const saved = await db.addComment(newComment);
      setComments(prev => [saved || newComment, ...prev]);
    } catch {
      // localStorage fallback
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      all[toUsername] = [newComment, ...(all[toUsername] || [])];
      localStorage.setItem('nova_comments', JSON.stringify(all));
      setComments(prev => [newComment, ...prev]);
    }
    setText('');
    setPosting(false);
  };

  const handleDelete = async (commentId, fromUsername) => {
    if (currentUser !== fromUsername && currentUser !== toUsername) return;
    try {
      const { db } = await import('../../services/db');
      await db.deleteComment(commentId);
    } catch {
      const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
      all[toUsername] = (all[toUsername] || []).filter(c => c.id !== commentId);
      localStorage.setItem('nova_comments', JSON.stringify(all));
    }
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const timeAgo = (iso) => {
    if (!iso) return '';
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60)    return `${s}s ago`;
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Post a comment */}
      {currentUser ? (
        <div style={{ marginBottom: '20px' }}>
          <textarea
            rows={2}
            placeholder={`Leave a comment on ${toUsername}'s profile...`}
            value={text}
            onChange={e => setText(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(94, 129, 244,0.05)', border: '1px solid rgba(94, 129, 244,0.2)', color: '#e2e5f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <button
            className="neon-button"
            onClick={handlePost}
            disabled={posting || !text.trim()}
            style={{ marginTop: '8px', padding: '8px 20px', opacity: (!text.trim() || posting) ? 0.4 : 1 }}
          >
            {posting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      ) : (
        <p style={{ color: 'rgba(158, 165, 196,0.4)', fontSize: '0.85rem', marginBottom: '16px' }}>
          Sign in to leave a comment.
        </p>
      )}

      {/* Comment list */}
      {loading ? (
        <p style={{ color: 'rgba(158, 165, 196,0.3)', fontSize: '0.85rem' }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p style={{ color: 'rgba(158, 165, 196,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No comments yet. Be the first!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding: '12px 14px', background: 'rgba(94, 129, 244,0.04)', border: '1px solid rgba(94, 129, 244,0.1)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.88rem' }}>{c.from_username}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'rgba(158, 165, 196,0.35)', fontSize: '0.72rem' }}>{timeAgo(c.created_at)}</span>
                  {(currentUser === c.from_username || currentUser === toUsername) && (
                    <button onClick={() => handleDelete(c.id, c.from_username)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255, 107, 122,0.5)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
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

const MemberPages = ({ targetUsername, onMemberSelect }) => {
  const [members,        setMembers]        = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [search,         setSearch]         = useState('');
  const [roleFilter,     setRoleFilter]     = useState('all');
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    // Load from Supabase (includes fav_games column)
    import('../../services/db').then(({ default: db }) => {
      Promise.all([db.getMemberProfiles(), db.getUsers()]).then(([profiles, users]) => {
        // db.getUsers() checks Supabase first (falling back to localStorage
        // only if unreachable), so role lookups are consistent no matter
        // which device/browser is viewing the Member Pages list - not just
        // the one where someone last logged in.
        const enriched = profiles.map((p) => ({
          ...p,
          role: users.find((u) => u.username === p.username)?.role || p.role || 'member',
        }));
        setMembers(enriched);
        setLoading(false);

        // Auto-open profile from URL deep link
        if (targetUsername) {
          const found = enriched.find((m) => m.username === targetUsername);
          if (found) setSelectedMember(found);
        }
      }).catch(() => {
        // Fallback to localStorage
        const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
        const users    = JSON.parse(localStorage.getItem('nova_users')       || '[]');
        const enriched = profiles.map((p) => ({ ...p, role: users.find((u) => u.username === p.username)?.role || 'member' }));
        setMembers(enriched);
        setLoading(false);
        if (targetUsername) {
          const found = enriched.find((m) => m.username === targetUsername);
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

  if (selectedMember) {
    return <MemberProfileView member={selectedMember} onBack={handleBack} />;
  }

  const filtered = members.filter((m) => {
    const matchSearch = m.username?.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === 'all' || (m.role || 'member') === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="page members-page">
      <div className="page-header">
        <h1 className="gradient-text">Member Pages</h1>
        <p className="subtitle">Explore member profiles across Nova</p>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', maxWidth: '320px' }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ padding: '8px 12px', background: 'rgba(10,14,33,0.8)', border: '1px solid rgba(94,129,244,0.3)', color: '#e2e5f0', borderRadius: '6px', fontSize: '0.88rem', cursor: 'pointer' }}
        >
          <option value="all">All Roles</option>
          <option value="owner">Owner</option>
          <option value="cofounder">Co-Founder</option>
          <option value="mod">Moderator</option>
          <option value="vizta_helper">Vizta Helper</option>
          <option value="member">Member</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(158, 165, 196,0.4)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="neon-card p-3" style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(158, 165, 196,0.5)' }}>
            {members.length === 0 ? 'No member profiles yet' : 'No members match your search'}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((member, i) => (
            <div key={i} className="neon-card" style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={() => handleSelect(member)}>
              <div style={{ height: '70px', background: member.top_banner_url ? `url(${member.top_banner_url}) center/cover` : 'linear-gradient(135deg, #0d1b2e 0%, #001a2e 50%, #0d1229 100%)', position: 'relative' }} />
              <div style={{ padding: '0 16px 16px', position: 'relative' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-cyan), var(--color-magenta))', border: '4px solid #1a1d2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', marginTop: '-30px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(94, 129, 244,0.2)' }}>
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
                    <p style={{ margin: '8px 0 0 0', color: 'rgba(158, 165, 196,0.65)', fontSize: '0.85rem', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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

// ── Member Profile View ───────────────────────────────────────
const MemberProfileView = ({ member, onBack }) => {
  const users      = JSON.parse(localStorage.getItem('nova_users') || '[]');
  const userRecord = users.find((u) => u.username === member.username);
  const role       = userRecord?.role || member.role || 'member';

  const savedUser   = JSON.parse(localStorage.getItem('nova_user') || 'null');
  const currentUser = savedUser?.username || null;

  const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
  const isOnline   = onlineData[member.username] > Date.now() - 5 * 60 * 1000;

  const [viewTab, setViewTab] = React.useState('about');
  const [copied,  setCopied]  = React.useState(false);

  // fav_games comes from the Supabase profile (cross-device)
  const favGames = member.fav_games || [];

  const presenceStatus = localStorage.getItem(`nova_presence_${member.username}`) || 'online';
  const presenceDot    = presenceStatus === 'online' ? '#43b581' : presenceStatus === 'idle' ? '#f04747' : '#747f8d';
  const presenceTxt    = isOnline
    ? (presenceStatus === 'online' ? 'Online' : presenceStatus === 'idle' ? 'Do Not Disturb' : 'Invisible')
    : 'Offline';

  const socials = [
    { key: 'twitter_url',   label: 'Twitter',   icon: '🐦' },
    { key: 'twitch_url',    label: 'Twitch',    icon: '🎮' },
    { key: 'youtube_url',   label: 'YouTube',   icon: '▶️' },
    { key: 'instagram_url', label: 'Instagram', icon: '📸' },
  ].filter((s) => member[s.key]);

  const VTABS = [
    { id: 'about',       label: 'About'        },
    { id: 'music',       label: 'Music'        },
    { id: 'favgames',    label: 'Fav Games'    },
    { id: 'robloxgames', label: 'Roblox Games' },
    { id: 'teams',       label: 'Teams'        },
    { id: 'comments',    label: 'Comments'     },
  ];

  // Path-based URL (not #hash) so link-preview bots can fetch it via
  // /api/preview-member and show this specific member's info.
  const shareUrl = `${window.location.origin}/members/${member.username}`;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', gap: '10px', margin: '0 0 16px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="neon-button" onClick={onBack}>← Back to Members</button>
        <button
          className="neon-button"
          onClick={() => copyToClipboard(shareUrl, setCopied)}
          style={{ fontSize: '0.82rem', padding: '8px 14px', borderColor: copied ? '#00ff88' : 'rgba(94, 129, 244,0.3)', color: copied ? '#00ff88' : 'rgba(158, 165, 196,0.7)' }}
        >
          {copied ? '✓ Copied!' : '🔗 Share Profile'}
        </button>
      </div>

      {/* Banner */}
      <div style={{ width: '100%', height: '200px', background: member.top_banner_url ? `url(${member.top_banner_url}) center/cover` : 'linear-gradient(135deg,rgba(0,60,120,0.8),rgba(0,20,60,0.9))', position: 'relative', overflow: 'visible' }}>
        <div style={{ position: 'absolute', bottom: '-48px', left: '20px' }}>
          <div style={{ width: '96px', height: '96px', borderRadius: '50%', border: '4px solid #0d1117', background: 'rgba(94, 129, 244,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', boxShadow: '0 0 0 2px rgba(94, 129, 244,0.3)' }}>
            {member.avatar_url ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'N'}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '56px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#e7e9ea', margin: '0 0 2px' }}>{member.username}</h2>
          <span style={{ ...roleBadgeStyle(role), padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{roleLabel(role)}</span>
        </div>
        <p style={{ color: 'rgba(158, 165, 196,0.45)', fontSize: '0.88rem', margin: '0 0 8px' }}>@{member.username}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? presenceDot : 'rgba(158, 165, 196,0.3)', display: 'inline-block' }} />
          <span style={{ color: 'rgba(158, 165, 196,0.5)', fontSize: '0.78rem' }}>{presenceTxt}</span>
        </div>

        {member.bio && <p style={{ color: 'rgba(220,230,255,0.85)', fontSize: '0.95rem', lineHeight: 1.5, margin: '8px 0' }}>{member.bio}</p>}

        {socials.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '8px 0' }}>
            {socials.map((s) => (
              <a key={s.key} href={member[s.key]} target="_blank" rel="noreferrer" style={{ color: 'rgba(158, 165, 196,0.5)', textDecoration: 'none', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {s.icon} {s.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '16px 0 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {VTABS.map((t) => (
          <button key={t.id} onClick={() => setViewTab(t.id)}
            style={{ flex: 1, minWidth: '80px', padding: '14px 8px', background: 'none', border: 'none', borderBottom: viewTab === t.id ? '2px solid var(--color-cyan)' : '2px solid transparent', color: viewTab === t.id ? '#e7e9ea' : 'rgba(158, 165, 196,0.5)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '0 16px' }}>
        {viewTab === 'about' && (
          <div style={{ padding: '20px 0' }}>
            {member.bio
              ? <p style={{ color: 'rgba(158, 165, 196,0.85)', lineHeight: 1.6, margin: 0 }}>{member.bio}</p>
              : <p style={{ color: 'rgba(158, 165, 196,0.3)', textAlign: 'center', padding: '20px' }}>No bio yet.</p>
            }
          </div>
        )}

        {viewTab === 'music' && (
          <div style={{ padding: '20px 0' }}>
            {/* Last.fm now playing — public, shows for everyone */}
            {member.lastfm_username && (
              <NowPlayingPublic lastfmUsername={member.lastfm_username} />
            )}
            {member.spotify_url && (
              <iframe title="Spotify"
                src={member.spotify_url.includes('/embed/') ? member.spotify_url : member.spotify_url.replace('open.spotify.com/', 'open.spotify.com/embed/')}
                width="100%" height="80" frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                style={{ borderRadius: '10px', display: 'block' }}
              />
            )}
            {!member.lastfm_username && !member.spotify_url && (
              <p style={{ color: 'rgba(158, 165, 196,0.3)', textAlign: 'center', padding: '20px' }}>No music linked.</p>
            )}
          </div>
        )}

        {viewTab === 'favgames' && (
          <div style={{ padding: '20px 0' }}>
            <FavGames favGames={favGames} />
          </div>
        )}

        {viewTab === 'robloxgames' && (
          <div style={{ padding: '20px 0' }}>
            <RobloxGames favGames={favGames} />
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
