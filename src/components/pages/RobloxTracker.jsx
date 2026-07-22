import React, { useState, useEffect } from 'react';
import './NovaFeatures.css';
import robloxService from '../../services/robloxService';
import { awardBadge } from '../../services/achievementsService';

const STORAGE_KEY = (username) => `nova_roblox_${username}`;

const presenceLabel = (p) => {
  if (!p) return null;
  switch (p.userPresenceType) {
    case 1:
      return { text: 'Online', color: '#3ad36b' };
    case 2:
      return { text: `In game${p.lastLocation ? ' · ' + p.lastLocation : ''}`, color: '#5e81f4' };
    case 3:
      return { text: 'In Studio', color: '#e0a93b' };
    default:
      return { text: 'Offline', color: '#6b7180' };
  }
};

const RobloxTracker = ({ user }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [presence, setPresence] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  // Load saved Roblox username on mount
  useEffect(() => {
    if (!user?.username) return;
    const stored = localStorage.getItem(STORAGE_KEY(user.username));
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setSaved(data);
        setProfile(data);
        // refresh presence live for a saved profile
        refreshPresence(data.id);
      } catch {}
    }
  }, [user]);

  async function refreshPresence(userId) {
    const p = await robloxService.getUserPresence(userId);
    setPresence(p);
  }

  async function fetchProfile() {
    const uname = input.trim();
    if (!uname) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    setPresence(null);
    try {
      const info = await robloxService.resolveByUsername(uname);
      if (!info) throw new Error('Unable to find username');

      const [avatar, badgeCount, presenceInfo] = await Promise.all([
        robloxService.getUserAvatar(info.id),
        robloxService.getBadgeCount(info.id),
        robloxService.getUserPresence(info.id),
      ]);

      const result = {
        id: info.id,
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
      setPresence(presenceInfo);

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
    setPresence(null);
    setInput('');
  }

  const status = presenceLabel(presence);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>🎮 Roblox Tracker</h1>
      <p style={{ color: 'rgba(158,165,196,0.7)', marginBottom: 18, fontSize: '0.9rem' }}>
        Link your Roblox account to show it on your Nova profile
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchProfile()}
          placeholder="Enter Roblox username…"
          style={{
            flex: '1 1 200px',
            minWidth: 180,
            padding: '10px 14px',
            background: 'rgba(94,129,244,0.06)',
            border: '1px solid rgba(94,129,244,0.2)',
            color: '#e2e5f0',
            borderRadius: 8,
            fontSize: '0.9rem',
          }}
        />
        <button
          onClick={fetchProfile}
          disabled={loading}
          style={{
            padding: '10px 18px',
            background: 'linear-gradient(135deg,#5e81f4,#7c5ef4)',
            border: 'none',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Loading…' : 'Look Up'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 14, color: '#f87171', fontSize: '0.88rem' }}>❌ {error}</div>
      )}

      {saved && user && (
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            background: 'rgba(58,211,107,0.08)',
            border: '1px solid rgba(58,211,107,0.25)',
            borderRadius: 8,
            color: '#3ad36b',
            fontSize: '0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span>✓ Roblox account linked to your Nova profile</span>
          <button
            onClick={unlink}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ea5c4',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.82rem',
            }}
          >
            Unlink
          </button>
        </div>
      )}

      {profile && (
        <div
          style={{
            marginTop: 20,
            borderRadius: 16,
            overflow: 'hidden',
            background: 'rgba(20,22,40,0.6)',
            border: '1px solid rgba(94,129,244,0.18)',
          }}
        >
          <div
            style={{
              height: 8,
              background: 'linear-gradient(90deg,#5e81f4,#7c5ef4,#e0a93b)',
            }}
          />
          <div style={{ padding: 20, textAlign: 'center' }}>
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt="avatar"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  border: '3px solid rgba(94,129,244,0.4)',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: 'rgba(94,129,244,0.15)',
                  margin: '0 auto',
                }}
              />
            )}

            <h2 style={{ marginTop: 12, fontSize: '1.3rem', fontWeight: 800 }}>
              {profile.displayName}
            </h2>
            <div style={{ color: 'rgba(158,165,196,0.7)', fontSize: '0.88rem' }}>
              @{profile.username}
            </div>

            {profile.isBanned && (
              <div
                style={{
                  marginTop: 8,
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: 'rgba(248,113,113,0.12)',
                  color: '#f87171',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                BANNED
              </div>
            )}

            {status && (
              <div
                style={{
                  marginTop: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  color: status.color,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: status.color,
                    boxShadow: `0 0 8px ${status.color}`,
                  }}
                />
                {status.text}
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: 12,
              }}
            >
              <Stat value={profile.badgeCount !== null ? `${profile.badgeCount}` : '—'} label="Badges" />
              <Stat
                value={profile.created ? new Date(profile.created).getFullYear() : '—'}
                label="Joined"
              />
            </div>

            {profile.description && (
              <p
                style={{
                  marginTop: 18,
                  fontSize: '0.85rem',
                  color: 'rgba(226,229,240,0.8)',
                  lineHeight: 1.5,
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {profile.description.slice(0, 400)}
                {profile.description.length > 400 ? '…' : ''}
              </p>
            )}

            <a
              href={`https://www.roblox.com/users/${profile.id}/profile`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                marginTop: 18,
                color: '#5e81f4',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              View on Roblox ↗
            </a>

            {!user && (
              <p style={{ marginTop: 14, color: 'rgba(158,165,196,0.6)', fontSize: '0.82rem' }}>
                Sign in to link this to your profile
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ value, label }) => (
  <div
    style={{
      padding: '12px 8px',
      borderRadius: 12,
      background: 'rgba(94,129,244,0.06)',
      border: '1px solid rgba(94,129,244,0.12)',
    }}
  >
    <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{value}</div>
    <div style={{ color: 'rgba(158,165,196,0.6)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {label}
    </div>
  </div>
);

export default RobloxTracker;