import React, { useEffect, useState } from 'react';
import { SPORT_ICONS, SPORT_SHORT, getTeamLogoUrl } from '../../data/teams';
import { getWatchList } from '../../services/mediaService';
import './Pages.css';

const SPORT_KEYS = ['mlb', 'nfl', 'nba', 'nhl', 'cfb', 'cbb'];
const TYPE_ICONS = { anime: 'ðŸŽŒ', movie: 'ðŸŽ¬', tv: 'ðŸ“º' };
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

/* â”€â”€ Fav Teams Display â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const FavTeams = ({ favTeams }) => {
  const hasSome = SPORT_KEYS.some((s) => (favTeams?.[s] || []).length > 0);
  if (!hasSome) return null;
  return (
    <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px 16px', marginTop: '14px' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        â­ Favorite Teams
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

/* â”€â”€ Watch List Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
        ðŸŽ¬ Watch List
      </div>
      <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ color: '#a5d6a7' }}>âœ“ {watched} watched</span>
        <span style={{ color: '#66bb6a' }}>â–¶ {watching} watching</span>
        <span style={{ color: '#64b5f6' }}>ðŸ“‹ {plan} planned</span>
      </div>

      {pinned.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(192,208,255,0.3)', marginBottom: '6px' }}>ðŸ“Œ Pinned</div>
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
                    â˜…{item.rating}
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
                {item.rating != null && <span style={{ color: '#fbbf24', fontSize: '0.78rem' }}>â˜… {item.rating}/10</span>}
                <span style={{ background: `${STATUS_COLORS[item.status]}1a`, color: STATUS_COLORS[item.status], border: `1px solid ${STATUS_COLORS[item.status]}44`, padding: '1px 7px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 700 }}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
              {item.review && (
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(192,208,255,0.55)', lineHeight: 1.4, fontStyle: 'italic' }}>
                  "{item.review.length > 100 ? item.review.slice(0, 100) + 'â€¦' : item.review}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* â”€â”€ Member List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
          placeholder="Search membersâ€¦"
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
                  {member.avatar_url ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'ðŸš€'}
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

/* â”€â”€ Member Profile View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const MemberProfileView = ({ member, onBack }) => {
  const users      = JSON.parse(localStorage.getItem('nova_users') || '[]');
  const userRecord = users.find((u) => u.username === member.username);
  const role       = userRecord?.role || member.role || 'member';

  const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
  const isOnline   = onlineData[member.username] > Date.now() - 5 * 60 * 1000;

  const socials = [
    { key: 'twitter_url',   label: 'Twitter',   icon: 'ðŸ¦' },
    { key: 'twitch_url',    label: 'Twitch',    icon: 'ðŸŽ®' },
    { key: 'youtube_url',   label: 'YouTube',   icon: 'â–¶ï¸' },
    { key: 'instagram_url', label: 'Instagram', icon: 'ðŸ“¸' },
  ].filter((s) => member[s.key]);

  const [viewTab, setViewTab] = React.useState('about');
  const favGames = JSON.parse(localStorage.getItem(`nova_favgames_${member.username}`) || '[]');
  const presenceStatus = localStorage.getItem(`nova_presence_${member.username}`) || 'online';
  const presenceDot = presenceStatus === 'online' ? '#43b581' : presenceStatus === 'idle' ? '#f04747' : '#747f8d';
  const presenceTxt = isOnline ? (presenceStatus === 'online' ? 'Online' : presenceStatus === 'idle' ? 'Do Not Disturb' : 'Invisible') : 'Offline';

  const VTABS = [
    { id:'about',     label:'About'      },
    { id:'music',     label:'Music'      },
    { id:'favgames',  label:'Fav Games'  },
    { id:'teams',     label:'Teams'      },
    { id:'watchlist', label:'Watch List' },
  ];

  return (
    <div style={{ maxWidth:'600px', margin:'0 auto', paddingBottom:'60px' }}>
      <button className="neon-button" style={{ margin:'0 0 16px 16px' }} onClick={onBack}>â† Back to Members</button>

      {/* Banner */}
      <div style={{ width:'100%', height:'200px', background: member.top_banner_url ? `url(${member.top_banner_url}) center/cover` : 'linear-gradient(135deg,rgba(0,60,120,0.8),rgba(0,20,60,0.9))', position:'relative', overflow:'visible' }}>
        <div style={{ position:'absolute', bottom:'-48px', left:'20px' }}>
          <div style={{ width:'96px', height:'96px', borderRadius:'50%', border:'4px solid #0d1117', background:'rgba(0,255,255,0.1)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', boxShadow:'0 0 0 2px rgba(0,255,255,0.3)' }}>
            {member.avatar_url ? <img src={member.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : 'N'}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding:'56px 20px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          <h2 style={{ fontSize:'1.25rem', fontWeight:900, color:'#e7e9ea', margin:'0 0 2px' }}>{member.username}</h2>
          <span style={{ ...roleBadgeStyle(role), padding:'3px 10px', borderRadius:'20px', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{roleLabel(role)}</span>
        </div>
        <p style={{ color:'rgba(192,208,255,0.45)', fontSize:'0.88rem', margin:'0 0 8px' }}>@{member.username}</p>

        {/* Presence */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
          <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: isOnline ? presenceDot : 'rgba(192,208,255,0.3)', display:'inline-block' }} />
          <span style={{ color:'rgba(192,208,255,0.5)', fontSize:'0.78rem' }}>{presenceTxt}</span>
        </div>

        {member.bio && <p style={{ color:'rgba(220,230,255,0.85)', fontSize:'0.95rem', lineHeight:1.5, margin:'8px 0' }}>{member.bio}</p>}

        {/* Socials */}
        {socials.length > 0 && (
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', margin:'8px 0' }}>
            {socials.map(s => (
              <a key={s.key} href={member[s.key]} target="_blank" rel="noreferrer"
                style={{ color:'rgba(192,208,255,0.5)', textDecoration:'none', fontSize:'0.82rem', display:'flex', alignItems:'center', gap:'4px' }}>
                {s.icon} {s.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.08)', margin:'16px 0 0', overflowX:'auto', scrollbarWidth:'none' }}>
        {VTABS.map(t => (
          <button key={t.id} onClick={() => setViewTab(t.id)}
            style={{ flex:1, minWidth:'80px', padding:'14px 8px', background:'none', border:'none', borderBottom: viewTab===t.id ? '2px solid var(--color-cyan)' : '2px solid transparent', color: viewTab===t.id ? '#e7e9ea' : 'rgba(192,208,255,0.5)', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding:'0 16px' }}>
        {viewTab === 'about' && (
          <div style={{ padding:'20px 0' }}>
            {member.bio
              ? <p style={{ color:'rgba(192,208,255,0.85)', lineHeight:1.6, margin:0 }}>{member.bio}</p>
              : <p style={{ color:'rgba(192,208,255,0.3)', textAlign:'center', padding:'20px' }}>No bio yet.</p>
            }
          </div>
        )}
        {viewTab === 'music' && (
          <div style={{ padding:'20px 0' }}>
            {member.spotify_url && (
              <iframe title="Spotify"
                src={member.spotify_url.includes('/embed/') ? member.spotify_url : member.spotify_url.replace('open.spotify.com/','open.spotify.com/embed/')}
                width="100%" height="80" frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                style={{ borderRadius:'10px', display:'block' }} />
            )}
            {!member.spotify_url && <p style={{ color:'rgba(192,208,255,0.3)', textAlign:'center', padding:'20px' }}>No music linked.</p>}
          </div>
        )}
        {viewTab === 'favgames' && (
          <div style={{ padding:'20px 0' }}>
            {favGames.length === 0
              ? <p style={{ color:'rgba(192,208,255,0.3)', textAlign:'center', padding:'20px' }}>No favorite games yet.</p>
              : favGames.map(g => (
                <div key={g.id} style={{ padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ margin:'0 0 4px', fontWeight:700, color:'var(--color-cyan)', fontSize:'0.95rem' }}>{g.text}</p>
                  {g.note && <p style={{ margin:'0 0 4px', color:'rgba(192,208,255,0.65)', fontSize:'0.85rem' }}>"{g.note}"</p>}
                  <p style={{ margin:0, fontSize:'0.72rem', color:'rgba(192,208,255,0.35)' }}>{g.date}</p>
                </div>
              ))
            }
          </div>
        )}
        {viewTab === 'teams' && (
          <div style={{ padding:'20px 0' }}>
            <FavTeams favTeams={member.fav_teams} />
          </div>
        )}
        {viewTab === 'watchlist' && (
          <div style={{ padding:'20px 0' }}>
            <WatchPreview username={member.username} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberPages;
