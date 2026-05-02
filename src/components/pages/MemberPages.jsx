import React, { useEffect, useState } from 'react';
import './Pages.css';

const roleLabel = (role) => {
  const map = { owner: 'Owner', cofounder: 'Co-Founder', mod: 'Moderator', nabb_helper: 'NABB Helper', member: 'Member' };
  return map[role] || 'Member';
};

const roleBadgeStyle = (role) => {
  const styles = {
    owner: { background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', color: '#ffd700' },
    cofounder: { background: 'rgba(255,100,0,0.15)', border: '1px solid rgba(255,100,0,0.4)', color: '#ff6400' },
    mod: { background: 'rgba(0,200,100,0.15)', border: '1px solid rgba(0,200,100,0.4)', color: '#00c864' },
    nabb_helper: { background: 'rgba(150,0,255,0.15)', border: '1px solid rgba(150,0,255,0.4)', color: '#9600ff' },
  };
  return styles[role] || { background: 'rgba(0,255,255,0.1)', border: '1px solid rgba(0,255,255,0.3)', color: 'var(--color-cyan)' };
};

const MemberPages = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const profiles = JSON.parse(localStorage.getItem('member_profiles') || '[]');
    const users = JSON.parse(localStorage.getItem('nova_users') || '[]');

    const merged = profiles.map(profile => {
      const user = users.find(u => u.username === profile.username);
      return { ...profile, role: user?.role || 'member' };
    });

    setMembers(merged);
  }, []);

  if (selectedMember) {
    return <MemberProfileView member={selectedMember} onBack={() => setSelectedMember(null)} />;
  }

  const filtered = members.filter(m =>
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
          placeholder="Search members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
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
            <div
              key={i}
              className="neon-card"
              style={{ cursor: 'pointer', overflow: 'hidden' }}
              onClick={() => setSelectedMember(member)}
            >
              {/* Mini banner */}
              <div style={{
                height: '70px',
                background: member.top_banner_url
                  ? `url(${member.top_banner_url}) center/cover`
                  : 'linear-gradient(135deg, #0d1b2e 0%, #001a2e 50%, #0d1229 100%)',
                position: 'relative'
              }} />

              <div style={{ padding: '0 16px 16px', position: 'relative' }}>
                {/* Avatar overlapping banner */}
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
                    <span style={{
                      ...roleBadgeStyle(member.role),
                      padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px'
                    }}>{roleLabel(member.role)}</span>
                  </div>

                  {member.bio && (
                    <p style={{ margin: '8px 0 0 0', color: 'rgba(192,208,255,0.65)', fontSize: '0.85rem', lineHeight: 1.4,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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

const MemberProfileView = ({ member, onBack }) => {
  const users = JSON.parse(localStorage.getItem('nova_users') || '[]');
  const userRecord = users.find(u => u.username === member.username);
  const role = userRecord?.role || member.role || 'member';

  const onlineData = JSON.parse(localStorage.getItem('nova_online') || '{}');
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const isOnline = onlineData[member.username] > fiveMinAgo;

  const socials = [
    { key: 'twitter_url', label: 'Twitter', icon: '🐦' },
    { key: 'twitch_url', label: 'Twitch', icon: '🎮' },
    { key: 'youtube_url', label: 'YouTube', icon: '▶️' },
    { key: 'instagram_url', label: 'Instagram', icon: '📸' },
  ].filter(s => member[s.key]);

  return (
    <div className="page" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <button className="neon-button" style={{ marginBottom: '20px', fontSize: '0.9rem' }} onClick={onBack}>
        ← Back to Members
      </button>

      {/* Banner */}
      <div style={{
        width: '100%', height: '200px', borderRadius: '12px 12px 0 0',
        background: member.top_banner_url
          ? `url(${member.top_banner_url}) center/cover`
          : 'linear-gradient(135deg, #0d1b2e 0%, #001a2e 50%, #0d1229 100%)'
      }} />

      {/* Card */}
      <div style={{
        background: '#1a1d2e', border: '1px solid rgba(0,255,255,0.12)', borderTop: 'none',
        borderRadius: '0 0 12px 12px', padding: '60px 20px 24px 20px', position: 'relative'
      }}>
        {/* Avatar */}
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

        {/* Online indicator */}
        <div style={{ position: 'absolute', top: '12px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '9px', height: '9px', borderRadius: '50%',
            background: isOnline ? '#00ff00' : 'rgba(192,208,255,0.3)',
            boxShadow: isOnline ? '0 0 8px rgba(0,255,0,0.6)' : 'none',
            display: 'inline-block'
          }} />
          <span style={{ color: 'rgba(192,208,255,0.5)', fontSize: '0.8rem' }}>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Username + role */}
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: '700' }}>{member.username}</h2>
            <span style={{
              ...roleBadgeStyle(role),
              padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>{roleLabel(role)}</span>
          </div>
          {member.discord_tag && (
            <p style={{ color: 'rgba(192,208,255,0.4)', fontSize: '0.85rem', margin: '0 0 4px 0' }}>{member.discord_tag}</p>
          )}
        </div>

        {/* About Me */}
        {member.bio && (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px 16px', marginTop: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>About Me</div>
            <p style={{ margin: 0, color: 'rgba(192,208,255,0.9)', fontSize: '0.95rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{member.bio}</p>
          </div>
        )}

        {/* Spotify */}
        {member.spotify_url && (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px 16px', marginTop: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>🎵 Listening To</div>
            <iframe title="Spotify" src={member.spotify_url} width="100%" height="90" frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media" style={{ borderRadius: '8px' }} />
          </div>
        )}

        {/* Connections */}
        {socials.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '14px 16px', marginTop: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(192,208,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Connections</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {socials.map(s => (
                <a key={s.key} href={member[s.key]} target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px', color: 'rgba(192,208,255,0.85)', fontSize: '0.85rem',
                    textDecoration: 'none', fontFamily: "'Space Mono', monospace", transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,255,0.1)'; e.currentTarget.style.color = 'var(--color-cyan)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(192,208,255,0.85)'; }}
                >
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
