import React, { useEffect, useState } from 'react';
import messagingService from '../../services/messagingService';

// Renders inline (positioned by the parent via a wrapping `style` div) —
// keeps this component dumb about layout so it can be dropped anywhere.
const MiniProfilePopover = ({ username, currentUsername, onClose, onViewProfile, onMuted, onBlocked, isMuted, conversationId }) => {
  const [profile, setProfile] = useState(null);
  const [muted, setMuted] = useState(!!isMuted);

  useEffect(() => {
    let active = true;
    messagingService.getMiniProfile(username).then(p => { if (active) setProfile(p); });
    return () => { active = false; };
  }, [username]);

  const toggleMute = async () => {
    const nowMuted = await messagingService.toggleMute(currentUsername, conversationId);
    setMuted(nowMuted);
    onMuted && onMuted(nowMuted);
  };

  const block = async () => {
    if (!window.confirm(`Block ${username}? They won't be able to message you.`)) return;
    onBlocked && onBlocked(username);
  };

  return (
    <div
      style={{
        position: 'absolute', zIndex: 40, width: 220, background: 'var(--color-bg-light, #131729)',
        border: '1px solid rgba(94,129,244,0.25)', borderRadius: 14, padding: 16,
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
      }}
      onMouseLeave={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'rgba(94,129,244,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, color: 'var(--color-cyan, #5e81f4)', fontSize: '1.3rem', marginBottom: 4,
        }}>
          {username.charAt(0).toUpperCase()}
        </div>
        <strong style={{ color: '#e2e5f0', fontSize: '0.95rem' }}>{username}</strong>
        <span style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.76rem' }}>@{username}</span>

        {profile?.bio && (
          <p style={{ color: 'rgba(158,165,196,0.75)', fontSize: '0.78rem', margin: '6px 0 0' }}>{profile.bio}</p>
        )}
        {profile?.badges?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 6 }}>
            {profile.badges.map((b, i) => (
              <span key={i} style={{
                fontSize: '0.68rem', padding: '2px 8px', borderRadius: 999,
                background: 'rgba(255,158,87,0.12)', color: 'var(--color-magenta, #ff9e57)',
              }}>{typeof b === 'string' ? b : b.label || b.name}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
        <button className="neon-button" style={{ fontSize: '0.78rem', padding: '7px 0' }} onClick={() => onViewProfile(username)}>
          View Profile
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={toggleMute}
            style={{
              flex: 1, fontSize: '0.74rem', padding: '6px 0', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(94,129,244,0.08)', border: '1px solid rgba(94,129,244,0.18)', color: '#c9cee0',
            }}
          >{muted ? 'Unmute' : 'Mute'}</button>
          <button
            onClick={block}
            style={{
              flex: 1, fontSize: '0.74rem', padding: '6px 0', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(255,107,122,0.08)', border: '1px solid rgba(255,107,122,0.25)', color: '#ff6b7a',
            }}
          >Block</button>
        </div>
      </div>
    </div>
  );
};

export default MiniProfilePopover;
