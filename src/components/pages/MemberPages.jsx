import React, { useEffect, useState } from 'react';
import { SPORT_ICONS, SPORT_SHORT, getTeamLogoUrl, getTeamByAbbr } from '../../data/teams';
import * as lfm from '../../services/lastfmService';
import { ProfileBackground, ProfileAudioPlayer, effectiveBgList, effectiveAudioList, RobloxLinkCard, RobloxGameCard, LeaguePlayerShowcase, WatchListPreview } from './MemberProfile';
import { getWatchList } from '../../services/mediaService';
import { MemberActivityTimeline, CommentsSection } from './MemberShared';
import { BadgeRow, DiscordVerifiedChip } from '../BadgeDisplay';
import { checkAndAwardDiscordBadges } from '../../services/discordBadgeCheck';
import { MemberGridSkeleton } from '../Skeleton';
import { checkRateLimit, recordAction } from '../../services/rateLimiter';
import { awardXP, levelProgress } from '../../services/reputationService';
import { currentUsername } from '../../services/favoritesService';
import FollowButton from '../FollowButton';
import { FOLLOW_TYPES, getFollowing } from '../../services/followService';
import db, { PRESENCE_META } from '../../services/db';
import pickemsDb from '../../services/pickemsDb';
import { BADGES as ACH_BADGES, getEarnedBadges, getBadgeProgress, syncBadges } from '../../services/achievementsService';
import { LevelBadge } from '../LevelBadge';
import { getCoins as getCoinsBalance } from '../../services/coinsStorage';

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
          ? `url(${member.top_banner_url}) ${member.banner_position || '50% 50%'}/cover no-repeat`
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
            ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: member.avatar_position || '50% 50%' }} />
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

  // "Unlisted"/"Members only" profiles are skipped in the browsable
  // directory grid — unlisted ones are still reachable by direct link,
  // and members-only ones show a locked message to logged-out visitors
  // if they're opened directly (see MemberProfileView below). A member
  // always sees their own card regardless of their visibility setting.
  const visibleMembers = members.filter(m =>
    m.username === viewerUsername ||
    !m.profile_visibility || m.profile_visibility === 'public'
  );

  if (selectedMember) return (
    <MemberProfileView
      member={selectedMember}
      onBack={handleBack}
      badgeTypes={badgeTypes}
      viewerProfile={viewerProfile}
      onFilterByBadge={(badgeId) => { setBadgeFilter(String(badgeId)); handleBack(); }}
      onFilterByTeam={(teamKey) => { setTeamFilter(teamKey); handleBack(); }}
    />
  );

  const filtered = visibleMembers.filter(m => {
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

  // ── Upcoming birthdays (next 7 days, including today) ───────────
  // `birthday` is stored as a full YYYY-MM-DD but only month/day is ever
  // shown elsewhere (see MemberProfileView) — same rule here, no years.
  const upcomingBirthdays = visibleMembers
    .filter(m => m.birthday)
    .map(m => {
      const bday = new Date(`${m.birthday}T00:00:00`);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      const daysAway = Math.round((next - today) / 86400000);
      return { member: m, daysAway, label: bday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
    })
    .filter(x => x.daysAway <= 7)
    .sort((a, b) => a.daysAway - b.daysAway);

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

      {upcomingBirthdays.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 10px',
          padding: '10px 16px', borderRadius: 12, marginBottom: 20,
          background: 'rgba(255,158,87,0.08)', border: '1px solid rgba(255,158,87,0.25)',
          fontSize: '0.85rem', color: 'rgba(255,224,190,0.9)',
        }}>
          <span style={{ fontWeight: 700 }}>
            🎂 {upcomingBirthdays.length} member{upcomingBirthdays.length === 1 ? '' : 's'} {upcomingBirthdays.length === 1 ? 'has' : 'have'} a birthday this week:
          </span>
          {upcomingBirthdays.map(({ member: m, label, daysAway }, i) => (
            <span key={m.username}>
              <button onClick={() => handleSelect(m)} style={{ background: 'none', border: 'none', padding: 0, color: '#ff9e57', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' }}>
                {m.username}
              </button>
              {' '}({daysAway === 0 ? 'today!' : label}){i < upcomingBirthdays.length - 1 ? ',' : ''}
            </span>
          ))}
        </div>
      )}

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
const MemberProfileView = ({ member, onBack, badgeTypes, viewerProfile, onFilterByBadge, onFilterByTeam }) => {
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
  const [isOnline, setIsOnline] = useState(null); // null = not yet known
  useEffect(() => {
    let cancelled = false;
    import('../../services/db').then(({ default: db }) => {
      db.getOnlineUsers().then((online) => {
        if (!cancelled) setIsOnline(online.includes(member.username));
      }).catch(() => {
        // The server check failed. localStorage('nova_online') only ever
        // reflects activity from THIS browser, so it's only meaningful for
        // the signed-in user's own status — using it for anyone else would
        // show a status that might be completely wrong for what's actually
        // happening on their device. Only trust it for your own profile;
        // for everyone else, fall back to "unknown" rather than guessing.
        if (member.username === currentUser) {
          const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
          if (!cancelled) setIsOnline(onlineData[member.username] > Date.now() - 5 * 60 * 1000);
        } else if (!cancelled) {
          setIsOnline(null);
        }
      });
    });
    return () => { cancelled = true; };
  }, [member.username, currentUser]);

  const [viewTab, setViewTab] = useState('overview');
  const [copied,  setCopied]  = useState(false);
  const [streak,  setStreak]  = useState(0);
  const [kudos,        setKudos]        = useState([]);
  const [kudosNote,    setKudosNote]    = useState('');
  const [givingKudos,  setGivingKudos]  = useState(false);
  const [kudosMessage, setKudosMessage] = useState('');
  const [profileViews, setProfileViews] = useState(member.profile_views || 0);
  const me = currentUsername();
  const isOwnProfile = me === member.username;
  // Achievement-badge progress (Coin Collector etc.) only makes sense for
  // the profile owner, since it's keyed off their own coin balance — a
  // visitor has no meaningful "progress" toward someone else's badge.
  const [ownCoins, setOwnCoins] = useState(0);
  useEffect(() => {
    if (isOwnProfile) setOwnCoins(getCoinsBalance());
  }, [isOwnProfile]);

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

  // Resolve a pinned comment's content (game/badge pins resolve directly
  // from data already on `member`, but a pinned comment lives in the
  // separate comments store, so it needs its own small fetch). Kept as
  // local state (seeded from member.pinned_item) so pinning/unpinning a
  // comment from this page updates immediately without a full reload.
  const [localPinnedItem, setLocalPinnedItem] = useState(member.pinned_item || null);
  const [pinnedComment, setPinnedComment] = useState(null);
  useEffect(() => {
    if (localPinnedItem?.type !== 'comment') { setPinnedComment(null); return; }
    let cancelled = false;
    const pinnedId = localPinnedItem.id;
    import('../../services/db').then(({ default: db }) => {
      db.getComments(member.username).then(list => {
        if (cancelled) return;
        setPinnedComment((list || []).find(c => String(c.id) === String(pinnedId)) || null);
      }).catch(() => {
        const all = JSON.parse(localStorage.getItem('nova_comments') || '{}');
        setPinnedComment((all[member.username] || []).find(c => String(c.id) === String(pinnedId)) || null);
      });
    });
    return () => { cancelled = true; };
  }, [member.username, localPinnedItem?.type, localPinnedItem?.id]);

  // Lets a member pin one comment left on their own page — persisted onto
  // their profile row alongside the game/badge pin option in the editor,
  // since only one thing total can be pinned at a time.
  const handlePinComment = async (commentId) => {
    const next = (localPinnedItem?.type === 'comment' && String(localPinnedItem.id) === String(commentId))
      ? null : { type: 'comment', id: String(commentId) };
    setLocalPinnedItem(next);
    try {
      const { default: db } = await import('../../services/db');
      // Strip fields that get merged onto `member` for display only
      // (role comes from the users table, visible_badge_ids/is_staff_of_month
      // are computed) — they aren't real nova_member_profiles columns, and
      // saveMemberProfile fills in defaults for any *missing* fav_games/
      // bg_media/etc, so sending a trimmed-but-otherwise-complete profile
      // (rather than a bare {username, pinned_item}) avoids accidentally
      // wiping those out.
      const { role, visible_badge_ids, is_staff_of_month, ...safeProfile } = member;
      await db.saveMemberProfile({ ...safeProfile, pinned_item: next });
    } catch {}
  };

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
      db.getUserStats(member.username).then((s) => { if (!cancelled) { setStreak(s?.login_streak || 0); setNovaXp(s?.xp || 0); } }).catch(() => {});
      db.getKudosReceived(member.username).then((list) => { if (!cancelled) setKudos(list || []); }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [member.username]);

  // ── Overview dashboard data: followers/following counts and an
  // all-time pick'em record for the Nova Stats grid. ─────────────────
  const [followerList,  setFollowerList]  = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [novaXp,        setNovaXp]        = useState(0);
  const [pickRecord,    setPickRecord]    = useState(null); // { correct, total } | null

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      db.getFollowersOf(FOLLOW_TYPES.USER, member.username).catch(() => []),
      getFollowing(member.username, FOLLOW_TYPES.USER).catch(() => []),
      pickemsDb.getAllTimeLeaderboard().catch(() => []),
    ]).then(([followers, following, leaderboard]) => {
      if (cancelled) return;
      setFollowerList(followers || []);
      setFollowingList(following || []);
      const row = (leaderboard || []).find(r => r.username === member.username);
      setPickRecord(row && row.total_picks > 0 ? { correct: row.correct_picks, total: row.total_picks } : null);
    });
    return () => { cancelled = true; };
  }, [member.username]);

  // Trophy Room — the member's own ordered pick of assigned badges to
  // showcase (member.visible_badge_ids is already that list, filtered to
  // badges they're actually still assigned — see withVisibleBadges above).
  const trophies = (member.visible_badge_ids || []).map(id => badgeTypes.find(b => String(b.id) === String(id))).filter(Boolean);

  // Best-effort achievement count. Earned "achievement" badges (Coin
  // Collector, Pick'em Pro, etc. — distinct from the admin-assigned
  // badges above) are tracked in localStorage per-browser (see
  // achievementsService.js), so this is only accurate on a device where
  // this member has actually been active.
  const achievementCount = getEarnedBadges(member.username).length;
  const levelInfo = levelProgress(novaXp);

  const primaryFavTeam = (() => {
    for (const sport of SPORT_KEYS) {
      const list = member.fav_teams?.[sport] || [];
      if (list.length) {
        const abbr = list[0];
        return { sport, abbr, name: getTeamByAbbr(sport, abbr)?.name || abbr };
      }
    }
    return null;
  })();

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
  const presenceMeta   = PRESENCE_META[presenceStatus] || PRESENCE_META.online;
  const presenceDot    = presenceMeta.color;
  const presenceTxt    = isOnline === true ? presenceMeta.label : isOnline === false ? 'Offline' : 'Status unknown';

  const socials = [
    { key: 'twitter_url',   label: 'Twitter',   icon: '𝕏', color: '#e2e5f0' },
    { key: 'twitch_url',    label: 'Twitch',    icon: '🎮', color: '#9146ff' },
    { key: 'youtube_url',   label: 'YouTube',   icon: '▶',  color: '#ff0000' },
    { key: 'instagram_url', label: 'Instagram', icon: '📸', color: '#e4405f' },
  ].filter(s => member[s.key]);

  const VTABS = [
    { id: 'overview',   label: 'Overview'    },
    { id: 'trophies',   label: 'Trophy Room' },
    { id: 'activity',   label: 'Activity'    },
    { id: 'stats',      label: 'Stats'       },
    { id: 'collection', label: 'Collection'  },
    { id: 'leagues',    label: 'Leagues'     },
    { id: 'friends',    label: 'Friends'     },
  ];

  const shareUrl = `${window.location.origin}${window.location.pathname}#members/${member.profile_slug || member.username}`;

  const robloxGames = favGames.filter(g => g.placeId);
  const sportsGames = favGames.filter(g => !g.placeId);

  // "Members only" profiles show a locked message to anyone who isn't
  // signed in — checked here (after all hooks above) rather than with an
  // early return higher up, since hooks can't be called conditionally.
  if (member.profile_visibility === 'members' && !me && !isOwnProfile) {
    return (
      <div className="gl-scope" style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>🔒</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e2e5f0', marginBottom: 6 }}>This profile is for members only</div>
        <p style={{ color: 'rgba(158,165,196,0.6)', fontSize: '0.88rem', marginBottom: 18 }}>
          {member.username} has set their page to be visible to signed-in members only. Sign in to view it.
        </p>
        <button onClick={onBack} className="neon-button" style={{ padding: '8px 20px' }}>← Back to Directory</button>
      </div>
    );
  }

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
        {currentUser && currentUser !== member.username && (
          <FollowButton
            type={FOLLOW_TYPES.USER}
            id={member.username}
            label={member.username}
            size="md"
            style={{ minHeight: 40 }}
          />
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
              <img src={member.top_banner_url} alt="" style={{ objectPosition: member.banner_position || '50% 50%' }} />
            </div>
          )}
          <div className="gl-public-avatar-row">
            <div className="gl-public-avatar">
              {member.avatar_url
                ? <img src={member.avatar_url} alt="" style={{ objectPosition: member.avatar_position || '50% 50%' }} />
                : (member.username?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="gl-public-name-row">
                <span className="gl-public-name" style={{ color: member.text_color || undefined }}>{member.username}</span>
                <span className="gl-public-diamond">◆</span>
              </div>
              <div className="gl-public-sub" title={member.bio || undefined} style={{ color: member.text_color ? `${member.text_color}99` : undefined }}>{roleLabel(role)}{member.bio ? ` · ${member.bio.slice(0, 40)}${member.bio.length > 40 ? '…' : ''}` : ''}</div>
              <div className="gl-public-joined">
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', marginRight: 5, background: isOnline === true ? presenceDot : 'rgba(220,215,240,0.3)', boxShadow: isOnline === true ? `0 0 6px ${presenceDot}` : 'none' }} />
                {presenceTxt}
              </div>
              <ListeningToPublic username={member.username} />
              <div className="member-follow-counts">
                <button onClick={() => setViewTab('friends')}><strong>{followerList.length}</strong> Followers</button>
                <button onClick={() => setViewTab('friends')}><strong>{followingList.length}</strong> Following</button>
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
              <BadgeRow badgeTypes={badgeTypes} ids={member.visible_badge_ids} size={16} onBadgeClick={onFilterByBadge ? (b) => onFilterByBadge(b.id) : undefined} />
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

          {localPinnedItem?.type === 'game' && (() => {
            const g = favGames.find(fg => String(fg.id) === String(localPinnedItem.id));
            if (!g) return null;
            return (
              <div className="gl-pinned-card">
                <span className="gl-pinned-kicker">📌 Pinned Game</span>
                <div className="gl-pinned-game-title">{g.text}</div>
                {g.note && <div className="gl-pinned-game-note">"{g.note}"</div>}
              </div>
            );
          })()}

          {localPinnedItem?.type === 'badge' && (member.visible_badge_ids || []).map(String).includes(String(localPinnedItem.id)) && (() => {
            const b = badgeTypes.find(bt => String(bt.id) === String(localPinnedItem.id));
            if (!b) return null;
            return (
              <div className="gl-pinned-card">
                <span className="gl-pinned-kicker">📌 Pinned Badge</span>
                <div className="gl-pinned-game-title">{b.icon} {b.name}</div>
              </div>
            );
          })()}

          {localPinnedItem?.type === 'comment' && pinnedComment && (
            <div className="gl-pinned-card">
              <span className="gl-pinned-kicker">📌 Pinned Comment</span>
              <div className="gl-pinned-game-title">{pinnedComment.content}</div>
              <div className="gl-pinned-game-note">— {pinnedComment.from_username}</div>
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
              <div className="member-overview-presence" style={{ '--presence-color': isOnline === true ? presenceDot : '#747f8d' }}>
                <span /> {presenceTxt}
              </div>
            </div>

            {(primaryFavTeam || member.fav_player) && (
              <div className="member-overview-grid" style={{ gridTemplateColumns: primaryFavTeam && member.fav_player ? 'repeat(2,1fr)' : '1fr' }}>
                {primaryFavTeam && (
                  <div className="member-overview-card">
                    <span>FAVORITE TEAM</span>
                    <strong>{primaryFavTeam.name}</strong>
                    <small>{SPORT_SHORT[primaryFavTeam.sport]}</small>
                  </div>
                )}
                {member.fav_player && (
                  <div className="member-overview-card">
                    <span>FAVORITE PLAYER</span>
                    <strong>{member.fav_player}</strong>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <span className="member-overview-kicker">NOVA STATS</span>
              <div className="member-overview-grid" style={{ marginTop: 10 }}>
                <div className="member-overview-card">
                  <span>LEVEL</span>
                  <strong>Lv. {levelInfo.level} · {levelInfo.title}</strong>
                  <small>{novaXp.toLocaleString()} XP</small>
                </div>
                <div className="member-overview-card">
                  <span>PREDICTIONS</span>
                  <strong>{pickRecord ? `${pickRecord.correct}–${pickRecord.total - pickRecord.correct}` : 'Not started'}</strong>
                  <small>{pickRecord ? `${pickRecord.total} pick'ems made` : "No Pick'ems played yet"}</small>
                </div>
                <div className="member-overview-card">
                  <span>ACHIEVEMENTS</span>
                  <strong>{achievementCount}</strong>
                  <small>{achievementCount === 1 ? 'badge earned' : 'badges earned'}</small>
                </div>
                <div className="member-overview-card">
                  <span>COMMUNITY ROLE</span>
                  <strong>{roleLabel(role)}</strong>
                  <small>{trophies.length} featured trophies</small>
                </div>
              </div>
            </div>

            <div className="member-overview-links">
              <span className="member-overview-kicker">QUICK ACCESS</span>
              <button onClick={() => setViewTab('trophies')}>Trophy Room <span>→</span></button>
              <button onClick={() => setViewTab('collection')}>Games &amp; music <span>→</span></button>
              <button onClick={() => setViewTab('leagues')}>Roblox leagues <span>→</span></button>
              <button onClick={() => setViewTab('friends')}>Friends &amp; comments <span>→</span></button>
            </div>
            <MemberActivityTimeline username={member.username} favGames={favGames} limit={5} />
          </div>
        )}

        {viewTab === 'trophies' && (() => {
          if (isOwnProfile) syncBadges(member.username, { profile: member, coins: ownCoins });
          const earnedIds = new Set(getEarnedBadges(member.username));
          const earnedAch = ACH_BADGES.filter(b => earnedIds.has(b.id));
          const lockedAch = ACH_BADGES.filter(b => !earnedIds.has(b.id));
          return (
            <div style={{ padding: '20px 0' }}>
              {/* Admin-assigned badges this member has chosen to feature */}
              <div className="member-trophy-room" style={{ margin: 0 }}>
                <div className="member-trophy-room-header">
                  <span className="member-overview-kicker">FEATURED BADGES</span>
                  {isOwnProfile && (
                    <button className="member-trophy-customize-btn" onClick={() => { window.location.hash = '#profile'; }}>
                      Customize Trophy Room
                    </button>
                  )}
                </div>
                {trophies.length === 0 ? (
                  <p style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.8rem', fontStyle: 'italic', margin: '8px 0 0' }}>
                    {isOwnProfile ? "You haven't featured any badges yet — customize your Trophy Room to show them off." : `${member.username} hasn't featured any badges yet.`}
                  </p>
                ) : (
                  <div className="member-trophy-grid">
                    {trophies.map(b => (
                      <div key={b.id} className="member-trophy-card" style={{ '--trophy-color': b.color || '#6c5ce7' }}>
                        <span className="member-trophy-icon">{b.icon}</span>
                        <span className="member-trophy-name">{b.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Earned achievement badges (Coin Collector, Early Adopter, etc.) */}
              <div className="tw-section" style={{ paddingTop: 20 }}>
                <div className="tw-section-title">Earned Badges ({earnedAch.length}/{ACH_BADGES.length})</div>
                {earnedAch.length === 0
                  ? <div className="tw-empty">{isOwnProfile ? 'No badges yet — keep playing!' : `${member.username} hasn't earned any badges yet.`}</div>
                  : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                      {earnedAch.map(b => (
                        <div key={b.id} title={b.desc} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 14px', borderRadius: 999,
                          border: `1px solid ${b.color}55`, background: `${b.color}12`,
                          color: b.color, fontSize: '0.85rem', fontWeight: 700,
                        }}>
                          <span style={{ fontSize: '1.1rem' }}>{b.emoji}</span>
                          {b.name}
                        </div>
                      ))}
                    </div>
                }
                {lockedAch.length > 0 && (
                  <>
                    <div className="tw-section-title" style={{ marginTop: 20 }}>Locked ({lockedAch.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                      {lockedAch.map(b => {
                        const progress = isOwnProfile ? getBadgeProgress(b.id, { coins: ownCoins }) : null;
                        const pct = progress ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : null;
                        return (
                          <div key={b.id} title={b.desc} style={{
                            display: 'flex', flexDirection: 'column', gap: 4,
                            padding: '8px 14px', borderRadius: 14, minWidth: progress ? 120 : undefined,
                            border: '1px solid rgba(94,129,244,0.14)', background: 'rgba(94,129,244,0.04)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1.1rem', filter: 'grayscale(1)', opacity: 0.45 }}>{b.emoji}</span>
                              <span style={{ color: 'rgba(158,165,196,0.55)', fontSize: '0.85rem', fontWeight: 600 }}>{b.name}</span>
                            </div>
                            {progress ? (
                              <>
                                <div style={{ height: 4, borderRadius: 999, background: 'rgba(158,165,196,0.15)', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: b.color }} />
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'rgba(158,165,196,0.45)', fontWeight: 600 }}>
                                  {progress.current.toLocaleString()}/{progress.target.toLocaleString()}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: '0.68rem', color: 'rgba(158,165,196,0.35)' }}>Not yet earned</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {viewTab === 'activity' && (
          <div style={{ padding: '20px 0' }}>
            <MemberActivityTimeline
              username={member.username}
              favGames={favGames}
              limit={30}
              emptyLabel={`No activity yet — badges earned, kudos, and favorite games will show up here.`}
            />
          </div>
        )}

        {viewTab === 'stats' && (
          <div style={{ padding: '20px 0' }}>
            <div className="member-overview-card" style={{ marginBottom: 14 }}>
              <span>LEVEL PROGRESS</span>
              <div style={{ marginTop: 8 }}><LevelBadge username={member.username} showBar /></div>
            </div>
            <div className="member-overview-grid">
              <div className="member-overview-card">
                <span>PREDICTIONS</span>
                <strong>{pickRecord ? `${pickRecord.correct}–${pickRecord.total - pickRecord.correct}` : 'Not started'}</strong>
                <small>{pickRecord ? `${Math.round((pickRecord.correct / pickRecord.total) * 100)}% correct` : "No Pick'ems played yet"}</small>
              </div>
              <div className="member-overview-card">
                <span>ACHIEVEMENTS</span>
                <strong>{achievementCount}</strong>
                <small>of {ACH_BADGES.length} available</small>
              </div>
              <div className="member-overview-card">
                <span>LOGIN STREAK</span>
                <strong>{streak} day{streak === 1 ? '' : 's'}</strong>
                <small>current streak</small>
              </div>
              <div className="member-overview-card">
                <span>PROFILE VIEWS</span>
                <strong>{profileViews.toLocaleString()}</strong>
                <small>all-time</small>
              </div>
              <div className="member-overview-card">
                <span>KUDOS RECEIVED</span>
                <strong>{kudos.length}</strong>
                <small>member endorsements</small>
              </div>
              <div className="member-overview-card">
                <span>ASSIGNED BADGES</span>
                <strong>{(member.visible_badge_ids || []).length}</strong>
                <small>{trophies.length} featured in Trophy Room</small>
              </div>
            </div>
          </div>
        )}

        {viewTab === 'collection' && (
          <div style={{ padding: '20px 0' }}>
            <div className="member-collection-section">
              <span className="member-overview-kicker">MUSIC</span>
              {member.lastfm_username && <NowPlayingPublic lastfmUsername={member.lastfm_username} />}
              {member.spotify_url && (
                <iframe title="Spotify"
                  src={member.spotify_url.includes('/embed/') ? member.spotify_url : member.spotify_url.replace('open.spotify.com/', 'open.spotify.com/embed/')}
                  width="100%" height="80" frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  style={{ borderRadius: 10, display: 'block', marginTop: 8 }}
                />
              )}
              {!member.lastfm_username && !member.spotify_url && (
                <p style={{ color: 'rgba(158,165,196,0.25)', fontStyle: 'italic', margin: '8px 0 0' }}>No music linked.</p>
              )}
            </div>

            <div className="member-collection-section">
              <FavTeams favTeams={member.fav_teams} onTeamClick={onFilterByTeam} />
            </div>

            <div className="member-collection-section">
              <span className="member-overview-kicker">FAVORITE GAMES</span>
              {sportsGames.length === 0
                ? <p style={{ color: 'rgba(158,165,196,0.25)', fontStyle: 'italic', margin: '8px 0 0' }}>No favorite games yet.</p>
                : sportsGames.map(g => (
                    <div key={g.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.95rem' }}>{g.text}</p>
                      {g.note && <p style={{ margin: 0, color: 'rgba(158,165,196,0.6)', fontSize: '0.83rem' }}>"{g.note}"</p>}
                    </div>
                  ))
              }
            </div>

            <div className="member-collection-section">
              <span className="member-overview-kicker">ROBLOX GAMES</span>
              {robloxGames.length === 0
                ? <p style={{ color: 'rgba(158,165,196,0.25)', fontStyle: 'italic', margin: '8px 0 0' }}>No Roblox games added yet.</p>
                : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginTop: 8 }}>
                    {robloxGames.map(g => (
                      <RobloxGameCard key={g.id} placeId={g.placeId} title={g.text} note={g.note} />
                    ))}
                  </div>
                )
              }
            </div>

            <div className="member-collection-section">
              <span className="member-overview-kicker">WATCH LIST</span>
              {getWatchList(member.username).length === 0
                ? <p style={{ color: 'rgba(158,165,196,0.25)', fontStyle: 'italic', margin: '8px 0 0' }}>{isOwnProfile ? 'No watch list yet.' : `${member.username} hasn't added anything yet.`}</p>
                : <WatchListPreview username={member.username} />
              }
            </div>
          </div>
        )}

        {viewTab === 'leagues' && (
          <div style={{ padding: '20px 0' }}>
            {member.roblox_username ? (
              <>
                <RobloxLinkCard username={member.roblox_username} />
                <div style={{ marginTop: 12 }}><LeaguePlayerShowcase robloxUsername={member.roblox_username} /></div>
              </>
            ) : (
              <p style={{ color: 'rgba(158,165,196,0.25)', textAlign: 'center', padding: 30, fontStyle: 'italic' }}>
                {isOwnProfile ? 'Link your Roblox account from your profile editor to show your league stats here.' : `${member.username} hasn't linked a Roblox account yet.`}
              </p>
            )}
          </div>
        )}

        {viewTab === 'friends' && (
          <div style={{ padding: '20px 0' }}>
            {/* Kudos — member-to-member endorsements. Anyone signed in
                except the profile owner can send one, with an optional
                short note. */}
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(94,129,244,0.05)', border: '1px solid rgba(94,129,244,0.14)', marginBottom: 18 }}>
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

            <div className="member-friends-columns">
              <div>
                <span className="member-overview-kicker">FOLLOWERS ({followerList.length})</span>
                {followerList.length === 0
                  ? <p style={{ color: 'rgba(158,165,196,0.25)', fontStyle: 'italic', margin: '8px 0 0' }}>No followers yet.</p>
                  : (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {followerList.map(f => (
                        <button key={f.id || f.username} className="member-friend-chip" onClick={() => { window.location.hash = `#members/${f.username}`; }}>
                          {f.username}
                        </button>
                      ))}
                    </div>
                  )
                }
              </div>
              <div>
                <span className="member-overview-kicker">FOLLOWING ({followingList.length})</span>
                {followingList.length === 0
                  ? <p style={{ color: 'rgba(158,165,196,0.25)', fontStyle: 'italic', margin: '8px 0 0' }}>Not following anyone yet.</p>
                  : (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {followingList.map(f => (
                        <button key={f.id || f.item_id} className="member-friend-chip" onClick={() => { window.location.hash = `#members/${f.item_id}`; }}>
                          {f.label || f.item_id}
                        </button>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <span className="member-overview-kicker">COMMENTS</span>
              <div style={{ marginTop: 8 }}>
                <CommentsSection toUsername={member.username} currentUser={currentUser}
                  isOwner={isOwnProfile} pinnedCommentId={localPinnedItem?.type === 'comment' ? localPinnedItem.id : null}
                  onPin={handlePinComment} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberPages;
