import React, { useState, useEffect } from 'react';
import './NovaFeatures.css';
import { awardBadge } from '../../services/achievementsService';

const STORAGE_KEY = (username) => `nova_roblox_${username}`;

const RobloxTracker = ({ user }) => {
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [profile, setProfile]   = useState(null);
  const [error, setError]       = useState(null);
  const [saved, setSaved]       = useState(null);

  // Load saved Roblox username on mount
  useEffect(() => {
    if (!user?.username) return;
    const stored = localStorage.getItem(STORAGE_KEY(user.username));
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setSaved(data);
        setProfile(data);
      } catch {}
    }
  }, [user]);

  async function fetchProfile() {
    const uname = input.trim();
    if (!uname) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      // Step 1: Resolve username → user ID
      const idRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(uname)}`)}`);
      if (!idRes.ok) throw new Error('User not found');
      const idData = await idRes.json();
      if (idData.errorMessage) throw new Error(idData.errorMessage);
      const userId = idData.Id;

      // Step 2: Get full user info
      const infoRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://users.roblox.com/v1/users/${userId}`)}`);
      const info = await infoRes.json();

      // Step 3: Get avatar thumbnail
      const thumbRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`)}`);
      const thumbData = await thumbRes.json();
      const avatar = thumbData?.data?.[0]?.imageUrl || null;

      // Step 4: Badge count
      let badgeCount = null;
      try {
        const badgeRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://badges.roblox.com/v1/users/${userId}/badges?limit=10`)}`);
        const badgeData = await badgeRes.json();
        badgeCount = badgeData?.data?.length ?? null;
      } catch {}

      const result = {
        id: userId,
        username: info.name,
        displayName: info.displayName,
        description: info.description,
        created: info.created,
        isBanned: info.isBanned,
        avatar,
        badgeCount,
        fetchedAt: new Date().toISOString(),
      };

      setProfile(result);

      // Save to localStorage and link to Nova account
      if (user?.username) {
        localStorage.setItem(STORAGE_KEY(user.username), JSON.stringify(result));
        setSaved(result);
        awardBadge(user.username, 'roblox_linked');
      }
    } catch (e) {
      setError(e.message || 'Failed to fetch Roblox profile');
    } finally {
      setLoading(false);
    }
  }

  function unlink() {
    if (!user?.username) return;
    localStorage.removeItem(STORAGE_KEY(user.username));
    setSaved(null);
    setProfile(null);
    setInput('');
  }

  return (
    <div className="page nf-page">
      <div className="nf-header">
        <h1>🎮 Roblox Tracker</h1>
        <p>Link your Roblox account to show it on your Nova profile</p>
      </div>

      <div className="nf-card">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchProfile()}
            placeholder="Enter Roblox username…"
            style={{ flex: 1, padding: '10px 14px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.9rem' }}
          />
          <button
            onClick={fetchProfile}
            disabled={loading}
            style={{ padding: '10px 20px', background: 'rgba(94,129,244,0.15)', border: '1px solid rgba(94,129,244,0.4)', color: 'var(--color-cyan)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap' }}
          >
            {loading ? 'Loading…' : 'Look Up'}
          </button>
        </div>
        {error && <div style={{ color: 'rgba(255,107,122,0.8)', fontSize: '0.85rem', marginBottom: 8 }}>❌ {error}</div>}
        {saved && user && (
          <div style={{ fontSize: '0.78rem', color: '#43b581', display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ Roblox account linked to your Nova profile
            <button onClick={unlink} style={{ background: 'none', border: 'none', color: 'rgba(255,107,122,0.7)', cursor: 'pointer', fontSize: '0.75rem', marginLeft: 4 }}>Unlink</button>
          </div>
        )}
      </div>

      {profile && (
        <div className="nf-card" style={{ marginTop: 0 }}>
          <div className="nf-roblox-info">
            {profile.avatar && (
              <img src={profile.avatar} alt="avatar" className="nf-roblox-avatar" />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#e2e5f0' }}>{profile.displayName}</div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(158,165,196,0.55)', marginBottom: 8 }}>@{profile.username}</div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ textAlign: 'center', background: 'rgba(94,129,244,0.07)', border: '1px solid rgba(94,129,244,0.15)', borderRadius: 8, padding: '8px 16px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-cyan)' }}>
                    {profile.badgeCount !== null ? `${profile.badgeCount}+` : '—'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Badges</div>
                </div>
                {profile.created && (
                  <div style={{ textAlign: 'center', background: 'rgba(94,129,244,0.07)', border: '1px solid rgba(94,129,244,0.15)', borderRadius: 8, padding: '8px 16px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e5f0' }}>
                      {new Date(profile.created).getFullYear()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(158,165,196,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Joined</div>
                  </div>
                )}
              </div>

              {profile.description && (
                <p style={{ fontSize: '0.82rem', color: 'rgba(158,165,196,0.65)', lineHeight: 1.5, margin: 0 }}>
                  {profile.description.slice(0, 300)}{profile.description.length > 300 ? '…' : ''}
                </p>
              )}
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <a
              href={`https://www.roblox.com/users/${profile.id}/profile`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '8px 18px', background: 'rgba(0,178,255,0.1)', border: '1px solid rgba(0,178,255,0.3)', color: '#00b2ff', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}
            >
              View on Roblox ↗
            </a>
            {!user && (
              <span style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.4)', alignSelf: 'center' }}>
                Sign in to link this to your profile
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RobloxTracker;
