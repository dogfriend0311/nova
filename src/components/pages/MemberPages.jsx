import React, { useEffect, useState } from 'react';
import { SPORT_ICONS, SPORT_SHORT, getTeamLogoUrl, getTeamByAbbr } from '../../data/teams';
import * as lfm from '../../services/lastfmService';
import { ProfileBackground, ProfileAudioPlayer, effectiveBgList, effectiveAudioList, RobloxLinkCard, RobloxGameCard } from './MemberProfile';
import { BadgeRow, DiscordVerifiedChip } from '../BadgeDisplay';
import { checkAndAwardDiscordBadges } from '../../services/discordBadgeCheck';
import { MemberGridSkeleton } from '../Skeleton';
import { checkRateLimit, recordAction } from '../../services/rateLimiter';
import { awardXP } from '../../services/reputationService';
import { currentUsername } from '../../services/favoritesService';

// ── role helpers ──────────────────────────────────────────────
const SPORT_KEYS = ['mlb', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'];

const roleLabel = (role) => {
  const m = { owner: 'Owner', cofounder: 'Co-Founder', mod: 'Moderator', vizta_helper: 'Roblox Baseball Helper', football_helper: 'Heavenly Football Stat Helper', member: 'Member' };
  return m[role] || 'Member';
};
export { roleLabel };
const roleColor = (role) => {
  const m = {
    owner:        '#ffd700',
    cofounder:    '#ff6400',
    mod:          '#00c864',
    vizta_helper: '#cc66ff',
    football_helper: '#ff9e57',
  };
  return m[role] || '#5e81f4';
};
export { roleColor };
const roleGlow = (role) => {
  const m = {
    owner:        'rgba(255,215,0,0.3)',
    cofounder:    'rgba(255,100,0,0.3)',
    mod:          'rgba(0,200,100,0.3)',
    vizta_helper: 'rgba(180,0,255,0.3)',
    football_helper: 'rgba(255,158,87,0.3)',
  };
  return m[role] || 'rgba(94,129,244,0.2)';
};
export { roleGlow };

function copyToClipboard(text, setCopied) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }).catch(() => {});
}

// Custom URL/slug support — a member page is reachable at either
// /members/<username> or, if they've claimed one, /members/<slug>.
// Username match wins so a slug can never shadow someone else's page.
function findMemberByIdentifier(list, identifier) {
  if (!identifier) return null;
  return list.find(m => m.username === identifier)
    || list.find(m => (m.profile_slug || '').toLowerCase() === identifier.toLowerCase())
    || null;
}


// ── Default gradient banners per role ─────────────────────────
const defaultBanner = (role) => {
  const m = {
    owner:        'linear-gradient(135deg,#1a0a00 0%,#3d1f00 40%,#1a0a00 100%)',
    cofounder:    'linear-gradient(135deg,#1a0500 0%,#2d1200 40%,#1a0500 100%)',
    mod:          'linear-gradient(135deg,#001a0d 0%,#003319 40%,#001a0d 100%)',
    vizta_helper: 'linear-gradient(135deg,#12003d 0%,#230066 40%,#12003d 100%)',
    football_helper: 'linear-gradient(135deg,#3d1400 0%,#66280a 40%,#3d1400 100%)',
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
  const [limitMsg, setLimitMsg] = useState('');

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
    const verdict = checkRateLimit('comment', currentUser);
    if (!verdict.allowed) { setLimitMsg(verdict.message); return; }
    setLimitMsg('');
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
    recordAction('comment', currentUser);
    awardXP(currentUser, 5);
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
            className="focus-ring"
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
          <button className="neon-button" onClick={handlePost} disabled={posting || !text.trim()}
            style={{ marginTop: 8, padding: '8px 20px', opacity: (!text.trim() || posting) ? 0.4 : 1 }}>
            {posting ? 'Posting...' : 'Post Comment'}
          </button>
          {limitMsg && <p style={{ color: '#ff9e57', fontSize: '0.78rem', marginTop: 8, marginBottom: 0 }}>{limitMsg}</p>}
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
const MemberCard = ({ member, badgeTypes, onClick }) => {
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
            {member.is_staff_of_month && (
              <span title="Staff of the Month" style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 8px', borderRadius: 20,
                background: 'rgba(255,158,87,0.15)', border: '1px solid rgba(255,158,87,0.4)',
                color: '#ffd700', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>🌟 Staff of the Month</span>
            )}
            <BadgeRow badgeTypes={badgeTypes} ids={member.visible_badge_ids} size={14} />
            <DiscordVerifiedChip verifiedAt={member.discord_verified_at} size="sm" />
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
          {member.created_at && (
            <p style={{ margin: '6px 0 0', color: 'rgba(158,165,196,0.35)', fontSize: '0.7rem' }}>
              Joined {new Date(member.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {member.profile_views > 0 && (
            <p style={{ margin: '4px 0 0', color: 'rgba(158,165,196,0.35)', fontSize: '0.7rem' }}>
              👁️ {member.profile_views.toLocaleString()} view{member.profile_views === 1 ? '' : 's'}
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
  const [badgeFilter,    setBadgeFilter]    = useState('all');
  const [teamFilter,     setTeamFilter]     = useState('all'); // "sport:ABBR", matched against each member's profile fav_teams
  const [loading,        setLoading]        = useState(true);
  const [badgeTypes,     setBadgeTypes]     = useState([]);

  // Attach the badge ids each member has both been assigned AND chosen to
  // display, so a revoked or hidden badge never shows up stale.
  const withVisibleBadges = (list, assignments) => list.map(m => {
    const assignedIds = new Set(assignments.filter(a => a.username === m.username).map(a => String(a.badge_id)));
    const chosen = Array.isArray(m.displayed_badges) ? m.displayed_badges : [];
    return { ...m, visible_badge_ids: chosen.filter(id => assignedIds.has(String(id))) };
  });

  useEffect(() => {
    import('../../services/db').then(({ default: db }) => {
      Promise.all([db.getMemberProfiles(), db.getUsers(), db.getBadgeTypes(), db.getMemberBadges(), db.getStaffOfMonth()]).then(([profiles, users, badges, assignments, sotm]) => {
        const enriched = withVisibleBadges(profiles.map(p => ({
          ...p,
          role: users.find(u => u.username === p.username)?.role || p.role || 'member',
          is_staff_of_month: !!sotm?.username && sotm.username === p.username,
        })), assignments || []);
        // Sort: owner first, then cofounder, mod, vizta_helper, member
        const ORDER = { owner: 0, cofounder: 1, mod: 2, vizta_helper: 3, member: 4 };
        enriched.sort((a, b) => (ORDER[a.role] ?? 5) - (ORDER[b.role] ?? 5));
        setMembers(enriched);
        setBadgeTypes(badges || []);
        checkAndAwardDiscordBadges(enriched).then(newlyVerified => {
          if (!newlyVerified.length) return;
          const now = new Date().toISOString();
          setMembers(prev => prev.map(m => newlyVerified.includes(m.username) ? { ...m, discord_verified_at: now } : m));
        }).catch(() => {});
        setLoading(false);
        if (targetUsername) {
          const found = findMemberByIdentifier(enriched, targetUsername);
          if (found) setSelectedMember(found);
        }
      }).catch(() => {
        const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
        const users    = JSON.parse(localStorage.getItem('nova_users')       || '[]');
        const enriched = withVisibleBadges(profiles.map(p => ({ ...p, role: users.find(u => u.username === p.username)?.role || 'member' })), []);
        setMembers(enriched);
        setLoading(false);
        if (targetUsername) {
          const found = findMemberByIdentifier(enriched, targetUsername);
          if (found) setSelectedMember(found);
        }
      });
    });
  }, [targetUsername]);

  const handleSelect = (member) => {
    setSelectedMember(member);
    if (onMemberSelect) onMemberSelect(member.profile_slug || member.username);
  };

  const handleBack = () => {
    setSelectedMember(null);
    if (onMemberSelect) onMemberSelect(null);
  };

  const viewerUsername = currentUsername();
  const viewerProfile = members.find(m => m.username === viewerUsername) || null;

  if (selectedMember) return (
    <MemberProfileView
      member={selectedMember}
      onBack={handleBack}
      badgeTypes={badgeTypes}
      viewerProfile={viewerProfile}
    />
  );

  const filtered = members.filter(m => {
    const ms = m.username?.toLowerCase().includes(search.toLowerCase());
    const mr = roleFilter === 'all' || (m.role || 'member') === roleFilter;
    const mb = badgeFilter === 'all' || (m.visible_badge_ids || []).map(String).includes(String(badgeFilter));
    const [tfSport, tfAbbr] = teamFilter === 'all' ? [] : teamFilter.split(':');
    const mt = teamFilter === 'all' || (m.fav_teams?.[tfSport] || []).includes(tfAbbr);
    return ms && mr && mb && mt;
  });

  // Every distinct real-world favorite team (NBA/NFL/MLB/NHL/CFB/CBB) any
  // member has picked in their profile's Teams section — used for the
  // team filter dropdown. Keyed "sport:ABBR" so teams that share an
  // abbreviation across sports (e.g. ATL in MLB and NBA) don't collide.
  // Plain computed value (not useMemo) since it runs after the early
  // `if (selectedMember) return` above — a hook here would be called
  // conditionally, which React disallows.
  const favTeamSeen = new Map();
  members.forEach(m => {
    SPORT_KEYS.forEach(sport => {
      (m.fav_teams?.[sport] || []).forEach(abbr => {
        const key = `${sport}:${abbr}`;
        if (!favTeamSeen.has(key)) favTeamSeen.set(key, { key, sport, abbr, name: getTeamByAbbr(sport, abbr).name || abbr });
      });
    });
  });
  const allFavTeamOptions = Array.from(favTeamSeen.values()).sort((a, b) => a.name.localeCompare(b.name));

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
            className="focus-ring"
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.15)', color: '#e2e5f0', borderRadius: 10, fontSize: '0.88rem', boxSizing: 'border-box' }}
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
        <select
          value={badgeFilter}
          onChange={e => setBadgeFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 20, background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.15)', color: badgeFilter === 'all' ? 'rgba(158,165,196,0.45)' : '#e2e5f0', fontSize: '0.78rem', minHeight: 36, cursor: 'pointer' }}
        >
          <option value="all">Any badge</option>
          {badgeTypes.map(b => <option key={b.id} value={b.id}>{b.icon ? `${b.icon} ` : ''}{b.name}</option>)}
        </select>
        <select
          value={teamFilter}
          onChange={e => setTeamFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 20, background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.15)', color: teamFilter === 'all' ? 'rgba(158,165,196,0.45)' : '#e2e5f0', fontSize: '0.78rem', minHeight: 36, cursor: 'pointer' }}
        >
          <option value="all">Any favorite team</option>
          {allFavTeamOptions.map(t => (
            <option key={t.key} value={t.key}>{SPORT_ICONS[t.sport]} {t.name} ({SPORT_SHORT[t.sport]})</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <MemberGridSkeleton />
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
            <MemberCard key={member.username || i} member={member} badgeTypes={badgeTypes} onClick={() => handleSelect(member)} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Member Profile View (improved) ────────────────────────────
const MemberProfileView = ({ member, onBack, badgeTypes, viewerProfile }) => {
  // `member.role` is already resolved correctly upstream (MemberDirectory
  // fetches it from db.getUsers(), which reads Supabase — the shared,
  // cross-device source of truth). We used to override it here with a
  // synchronous, local-only localStorage['nova_users'] lookup, which could
  // hold a stale cached role (e.g. from before an owner was promoted) and
  // silently win over the correct one, making the page show the wrong
  // role. Trust member.role; only fall back to 'member' if it's missing.
  const role       = member.role || 'member';
  const rc         = member.accent_color || roleColor(role);
  const rg         = member.accent_color ? `${member.accent_color}77` : roleGlow(role);

  const savedUser   = JSON.parse(localStorage.getItem('nova_user') || 'null');
  const currentUser = savedUser?.username || null;

  // Cross-device online check. This used to read localStorage('nova_online')
  // directly, which only ever reflects activity that happened in THIS
  // browser — so a friend online on their own device never showed up here.
  // db.getOnlineUsers() checks last_seen on the server instead.
  const [isOnline, setIsOnline] = useState(false);
  useEffect(() => {
    let cancelled = false;
    import('../../services/db').then(({ default: db }) => {
      db.getOnlineUsers().then((online) => {
        if (!cancelled) setIsOnline(online.includes(member.username));
      }).catch(() => {
        const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
        if (!cancelled) setIsOnline(onlineData[member.username] > Date.now() - 5 * 60 * 1000);
      });
    });
    return () => { cancelled = true; };
  }, [member.username]);

  const [viewTab, setViewTab] = useState('overview');
  const [copied,  setCopied]  = useState(false);
  const [streak,  setStreak]  = useState(0);
  const [kudos,        setKudos]        = useState([]);
  const [kudosNote,    setKudosNote]    = useState('');
  const [givingKudos,  setGivingKudos]  = useState(false);
  const [kudosMessage, setKudosMessage] = useState('');
  const [profileViews, setProfileViews] = useState(member.profile_views || 0);
  const me = currentUsername();

  // Profile visit counter — count once per browser session per profile,
  // and never when someone is looking at their own page, so refreshing
  // your own profile (or bouncing back and forth) doesn't inflate it.
  useEffect(() => {
    if (!member?.username || me === member.username) return;
    const seenKey = 'nova_viewed_profiles';
    let seen = [];
    try { seen = JSON.parse(sessionStorage.getItem(seenKey) || '[]'); } catch {}
    if (seen.includes(member.username)) return;
    import('../../services/db').then(({ default: db }) => {
      db.incrementProfileView(member.username).then((next) => {
        if (typeof next === 'number') setProfileViews(next);
      }).catch(() => {});
    });
    try { sessionStorage.setItem(seenKey, JSON.stringify([...seen, member.username])); } catch {}
  }, [member?.username, me]);

  // Mutual indicators — real-world favorite teams (NBA/NFL/MLB/NHL/etc.)
  // the viewer and this member have both picked in their profile's Teams
  // section. Only meaningful when signed in and looking at someone
  // else's page.
  const mutualTeams = React.useMemo(() => {
    if (!me || me === member.username || !viewerProfile?.fav_teams) return [];
    const out = [];
    SPORT_KEYS.forEach(sport => {
      const mine   = viewerProfile.fav_teams?.[sport] || [];
      const theirs = member.fav_teams?.[sport] || [];
      mine.forEach(abbr => {
        if (theirs.includes(abbr)) out.push(getTeamByAbbr(sport, abbr).name || abbr);
      });
    });
    return out;
  }, [me, member.username, member.fav_teams, viewerProfile]);

  useEffect(() => {
    let cancelled = false;
    import('../../services/db').then(({ default: db }) => {
      db.getUserStats(member.username).then((s) => { if (!cancelled) setStreak(s?.login_streak || 0); }).catch(() => {});
      db.getKudosReceived(member.username).then((list) => { if (!cancelled) setKudos(list || []); }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [member.username]);

  const handleGiveKudos = async () => {
    if (!me || me === member.username) return;
    const verdict = checkRateLimit('kudos', me);
    if (!verdict.allowed) { setKudosMessage(verdict.message); return; }
    setGivingKudos(true);
    setKudosMessage('');
    try {
      const { default: db } = await import('../../services/db');
      await db.giveKudos(me, member.username, kudosNote);
      recordAction('kudos', me);
      awardXP(member.username, 5).catch(() => {});
      const fresh = await db.getKudosReceived(member.username);
      setKudos(fresh || []);
      setKudosNote('');
      setKudosMessage('Kudos sent! 👍');
    } catch {
      setKudosMessage("Couldn't send kudos — try again in a moment.");
    } finally {
      setGivingKudos(false);
    }
  };

  const joinedDate = member.created_at ? new Date(member.created_at) : null;
  const isAnniversaryToday = !!joinedDate
    && joinedDate.getMonth() === new Date().getMonth()
    && joinedDate.getDate() === new Date().getDate()
    && joinedDate.getFullYear() < new Date().getFullYear();
  const anniversaryYears = joinedDate ? (new Date().getFullYear() - joinedDate.getFullYear()) : 0;

  const favGames       = member.fav_games || [];
  // Read the status this member picked from their synced profile data
  // (member.presence, from nova_member_profiles) instead of this viewer's
  // own localStorage — that key is only ever populated for yourself, never
  // for anyone else you look up.
  const presenceStatus = member.presence || 'online';
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
    { id: 'overview',    label: 'Overview'     },
    { id: 'music',       label: '🎵 Music'     },
    { id: 'favgames',    label: 'Fav Games'    },
    { id: 'robloxgames', label: 'Roblox'       },
    { id: 'teams',       label: '🏆 Teams'     },
    { id: 'comments',    label: '💬 Comments'  },
  ];

  const shareUrl = `${window.location.origin}${window.location.pathname}#members/${member.profile_slug || member.username}`;

  const robloxGames = favGames.filter(g => g.placeId);
  const sportsGames = favGames.filter(g => !g.placeId);

  return (
    <div className="gl-scope" style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 60 }}>
      <ProfileBackground list={effectiveBgList(member)} />
      <ProfileAudioPlayer list={effectiveAudioList(member)} />

      {/* Back + share row */}
      <div style={{ display: 'flex', gap: 10, padding: '16px 12px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={onBack}
          style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(220,215,240,0.8)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.83rem', minHeight: 40 }}>
          ← Back
        </button>
        <button onClick={() => copyToClipboard(shareUrl, setCopied)}
          style={{ padding: '9px 16px', background: copied ? 'rgba(0,255,136,0.07)' : 'rgba(108,92,231,0.08)', border: `1px solid ${copied ? 'rgba(0,255,136,0.4)' : 'rgba(108,92,231,0.3)'}`, color: copied ? '#00ff88' : 'rgba(220,215,240,0.7)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', minHeight: 40, transition: 'all 0.2s' }}>
          {copied ? '✓ Copied!' : '🔗 Share'}
        </button>
        {currentUser && currentUser !== member.username && (
          <button onClick={() => { window.location.hash = `#messages/${member.username}`; }}
            style={{ padding: '9px 16px', background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.3)', color: 'rgba(220,215,240,0.8)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', minHeight: 40 }}>
            💬 Message
          </button>
        )}
      </div>

      {/* Floating glow profile card, guns.lol style */}
      <div className="gl-public-card-wrap">
        <div
          className="gl-public-card"
          style={{
            '--gl-role-color': rc, '--gl-role-glow': rg, '--gl-role-border': `${rc}55`,
            background: member.bg_color || undefined,
          }}
        >
          {member.top_banner_url && (
            <div className="gl-public-banner">
              <img src={member.top_banner_url} alt="" />
            </div>
          )}
          <div className="gl-public-avatar-row">
            <div className="gl-public-avatar">
              {member.avatar_url
                ? <img src={member.avatar_url} alt="" />
                : (member.username?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="gl-public-name-row">
                <span className="gl-public-name" style={{ color: member.text_color || undefined }}>{member.username}</span>
                <span className="gl-public-diamond">◆</span>
              </div>
              <div className="gl-public-sub" title={member.bio || undefined} style={{ color: member.text_color ? `${member.text_color}99` : undefined }}>{roleLabel(role)}{member.bio ? ` · ${member.bio.slice(0, 40)}${member.bio.length > 40 ? '…' : ''}` : ''}</div>
              <div className="gl-public-joined">
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 5, background: isOnline ? presenceDot : 'rgba(220,215,240,0.3)', boxShadow: isOnline ? `0 0 6px ${presenceDot}` : 'none' }} />
                {presenceTxt}
              </div>
            </div>
          </div>

          {(member.is_staff_of_month || (member.visible_badge_ids && member.visible_badge_ids.length > 0) || streak >= 2 || member.discord_verified_at) && (
            <div className="gl-public-badges">
              {member.is_staff_of_month && (
                <span title="Staff of the Month" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(255,158,87,0.15)', border: '1px solid rgba(255,158,87,0.4)',
                  color: '#ffd700', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>🌟 Staff of the Month</span>
              )}
              {streak >= 2 && (
                <span title={`Active ${streak} days in a row`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(255,100,0,0.12)', border: '1px solid rgba(255,100,0,0.35)',
                  color: '#ff9e57', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>🔥 {streak} Day Streak</span>
              )}
              <DiscordVerifiedChip verifiedAt={member.discord_verified_at} size="lg" />
              <BadgeRow badgeTypes={badgeTypes} ids={member.visible_badge_ids} size={16} />
            </div>
          )}

          {isAnniversaryToday && (
            <div style={{
              marginTop: 10, padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)',
              color: '#ffd700', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center',
            }}>
              🎉 Joined Nova {anniversaryYears} year{anniversaryYears === 1 ? '' : 's'} ago today!
            </div>
          )}

          {(joinedDate || member.birthday || profileViews > 0) && (
            <p style={{ margin: '8px 0 0', color: 'rgba(158,165,196,0.4)', fontSize: '0.76rem', textAlign: 'center' }}>
              {[
                joinedDate && `Member since ${joinedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`,
                member.birthday && `🎂 ${new Date(`${member.birthday}T00:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`,
                `👁️ ${profileViews.toLocaleString()} view${profileViews === 1 ? '' : 's'}`,
              ].filter(Boolean).join(' · ')}
            </p>
          )}

          {member.bio && <p className="gl-public-bio" style={{ color: member.text_color ? `${member.text_color}cc` : undefined }}>{member.bio}</p>}

          {mutualTeams.length > 0 && (
            <div style={{
              marginTop: 10, padding: '7px 14px', borderRadius: 20, textAlign: 'center',
              background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.25)',
              color: '#5e81f4', fontSize: '0.76rem', fontWeight: 700,
            }}>
              {mutualTeams.length === 1
                ? `🤝 You both follow the ${mutualTeams[0]}`
                : `🤝 ${mutualTeams.length} mutual teams: ${mutualTeams.slice(0, 3).join(', ')}${mutualTeams.length > 3 ? '…' : ''}`}
            </div>
          )}

          {/* Kudos — member-to-member endorsements. Anyone signed in
              except the profile owner can send one, with an optional
              short note. */}
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.14)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#e2e5f0', fontSize: '0.88rem' }}>👍 {kudos.length} Kudos</span>
              {me && me !== member.username && (
                <div style={{ display: 'flex', gap: 6, flex: '1 1 240px' }}>
                  <input
                    type="text"
                    value={kudosNote}
                    onChange={(e) => setKudosNote(e.target.value)}
                    placeholder="Optional note…"
                    maxLength={200}
                    style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(94,129,244,0.15)', color: '#e2e5f0', fontSize: '0.8rem' }}
                  />
                  <button
                    onClick={handleGiveKudos}
                    disabled={givingKudos}
                    className="neon-button"
                    style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  >
                    {givingKudos ? 'Sending…' : 'Give Kudos'}
                  </button>
                </div>
              )}
            </div>
            {kudosMessage && <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--color-cyan)' }}>{kudosMessage}</div>}
            {kudos.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {kudos.slice(0, 5).map((k) => (
                  <div key={k.id} style={{ fontSize: '0.78rem', color: 'rgba(200,210,240,0.65)' }}>
                    <strong style={{ color: '#e2e5f0' }}>{k.from_username}</strong>
                    {k.note ? <> — {k.note}</> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {member.roblox_username && <div style={{ marginTop: 12 }}><RobloxLinkCard username={member.roblox_username} /></div>}

          <div className="gl-public-meta-row">
            {socials.map(s => (
              <a key={s.key} href={member[s.key]} target="_blank" rel="noreferrer" className="gl-public-meta-item" style={{ textDecoration: 'none' }}>
                <span style={{ color: s.color }}>{s.icon}</span> {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', scrollbarWidth: 'none', margin: '4px 0 0' }}>
        {VTABS.map(t => (
          <button key={t.id} onClick={() => setViewTab(t.id)}
            style={{ flex: 1, minWidth: 70, padding: '13px 8px', background: 'none', border: 'none', borderBottom: viewTab === t.id ? `2px solid ${rc}` : '2px solid transparent', color: viewTab === t.id ? '#f1eef9' : 'rgba(220,215,240,0.4)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.18s', minHeight: 44 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '0 20px' }}>
        {viewTab === 'overview' && (
          <div className="member-profile-overview">
            <div className="member-overview-hero">
              <div>
                <span className="member-overview-kicker">MEMBER DOSSIER</span>
                <h3>{member.username}'s Nova profile</h3>
                <p>{member.bio || 'A public member profile across Nova communities, games, and league culture.'}</p>
              </div>
              <div className="member-overview-presence" style={{ '--presence-color': isOnline ? presenceDot : '#747f8d' }}>
                <span /> {presenceTxt}
              </div>
            </div>
            <div className="member-overview-grid">
              <div className="member-overview-card">
                <span>COMMUNITY ROLE</span>
                <strong>{roleLabel(role)}</strong>
                <small>{member.visible_badge_ids?.length || 0} visible badges</small>
              </div>
              <div className="member-overview-card">
                <span>ROBLOX PROFILE</span>
                <strong>{member.roblox_username || 'Not linked'}</strong>
                <small>{robloxGames.length} Roblox games listed</small>
              </div>
              <div className="member-overview-card">
                <span>SPORTS IDENTITY</span>
                <strong>{member.favorite_team || 'Open profile'}</strong>
                <small>{member.favorite_teams?.length || 0} favorite teams</small>
              </div>
              <div className="member-overview-card">
                <span>PROFILE SIGNAL</span>
                <strong>{socials.length ? `${socials.length} linked socials` : 'Private by choice'}</strong>
                <small>{member.lastfm_username || member.spotify_url ? 'Music connected' : 'No music service linked'}</small>
              </div>
            </div>
            <div className="member-overview-links">
              <span className="member-overview-kicker">QUICK ACCESS</span>
              <button onClick={() => setViewTab('robloxgames')}>Roblox games <span>→</span></button>
              <button onClick={() => setViewTab('teams')}>Favorite teams <span>→</span></button>
              <button onClick={() => setViewTab('comments')}>Community comments <span>→</span></button>
            </div>
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
                    <RobloxGameCard key={g.id} placeId={g.placeId} title={g.text} note={g.note} />
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
