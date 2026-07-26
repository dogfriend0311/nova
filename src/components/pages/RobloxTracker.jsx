import React, { useState, useEffect } from 'react';
import './NovaFeatures.css';
import { awardBadge } from '../../services/achievementsService';

const STORAGE_KEY = (username) => `nova_roblox_${username}`;

// Roblox lookups now go through our own /api/roblox-lookup serverless
// function (server-to-server, no CORS issue) instead of public CORS
// proxies like corsproxy.io / allorigins, which were unreliable and had
// no timeout — that's what caused "unable to find username" + an
// infinite loading spinner. This fetch always resolves within ~10s.
async function fetchWithTimeout(url, ms = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const RobloxTracker = ({ user }) => {
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error,   setError]   = useState(null);
  const [saved,   setSaved]   = useState(null);

  // Load saved Roblox username on mount
  useEffect(() => {
    if (!user?.username) return;
    const stored = localStorage.getItem(STORAGE_KEY(user.username));
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setSaved(data);
        setProfile(data);
        setInput(data.username || '');
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
      const res = await fetchWithTimeout(`/api/roblox-lookup?username=${encodeURIComponent(uname)}`, 10000);
      const result = await res.json().catch(() => null);
      if (!res.ok || !result) {
        throw new Error(result?.error || `User "${uname}" not found. Check spelling and try again.`);
      }

      setProfile(result);

      // Link to Nova account — save locally for instant reload, AND to the
      // shared member profile in Supabase so it actually shows up on the
      // member page (localStorage alone never left this browser).
      if (user?.username) {
        localStorage.setItem(STORAGE_KEY(user.username), JSON.stringify(result));
        setSaved(result);
        awardBadge(user.username, 'roblox_linked');
        try {
          const { default: db } = await import('../../services/db');
          const profiles = await db.getMemberProfiles();
          const existing = profiles.find(p => p.username === user.username) || { username: user.username };
          await db.saveMemberProfile({ ...existing, roblox_username: result.username, roblox_id: result.id });
        } catch (linkErr) {
          console.error('Failed to save Roblox link to profile:', linkErr);
        }
      }
    } catch (e) {
      setError(e.name === 'AbortError' ? 'Roblox took too long to respond. Please try again.' : (e.message || 'Failed to fetch Roblox profile'));
    } finally {
      setLoading(false);
    }
  }

  async function unlink() {
    if (!user?.username) return;
    localStorage.removeItem(STORAGE_KEY(user.username));
    setSaved(null);
    setProfile(null);
    setInput('');
    try {
      const { default: db } = await import('../../services/db');
      const profiles = await db.getMemberProfiles();
      const existing = profiles.find(p => p.username === user.username);
      if (existing) await db.saveMemberProfile({ ...existing, roblox_username: '', roblox_id: '' });
    } catch (err) {
      console.error('Failed to clear Roblox link from profile:', err);
    }
  }

  const statBox = (value, label) => (
    <div style={{ textAlign: 'center', background: 'rgba(94,129,244,0.07)', border: '1px solid rgba(94,129,244,0.15)', borderRadius: 8, padding: '10px 18px', minWidth: 80 }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-cyan)' }}>
        {value !== null ? (typeof value === 'number' ? value.toLocaleString() : value) : '—'}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'rgba(158,165,196,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );

  return (
    <div className="nf-page">
      <div className="nf-header">
        <h1>🎮 Roblox Tracker</h1>
        <p>Link your Roblox account to show it on your Nova profile</p>
      </div>

      {/* ── Search ─────────────────────────────────────── */}
      <div className="nf-card">
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && fetchProfile()}
            placeholder="Enter exact Roblox username…"
            style={{ flex: '1 1 180px', padding: '10px 14px', background: 'rgba(94,129,244,0.06)', border: '1px solid rgba(94,129,244,0.2)', color: '#e2e5f0', borderRadius: 8, fontSize: '0.9rem', minWidth: 0 }}
          />
          <button
            onClick={fetchProfile}
            disabled={loading || !input.trim()}
            style={{ padding: '10px 22px', background: loading ? 'rgba(94,129,244,0.08)' : 'rgba(94,129,244,0.15)', border: '1px solid rgba(94,129,244,0.4)', color: 'var(--color-cyan)', borderRadius: 8, cursor: loading ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', opacity: !input.trim() ? 0.5 : 1 }}
          >
            {loading ? 'Loading…' : 'Look Up'}
          </button>
        </div>

        {error && (
          <div style={{ color: 'rgba(255,107,122,0.85)', fontSize: '0.85rem', padding: '8px 12px', background: 'rgba(255,107,122,0.06)', border: '1px solid rgba(255,107,122,0.2)', borderRadius: 8, marginBottom: 8 }}>
            ❌ {error}
          </div>
        )}

        {saved && user && (
          <div style={{ fontSize: '0.78rem', color: '#43b581', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>✓ Roblox account linked to your Nova profile</span>
            <button
              onClick={unlink}
              style={{ background: 'none', border: 'none', color: 'rgba(255,107,122,0.7)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, textDecoration: 'underline' }}
            >
              Unlink
            </button>
          </div>
        )}
      </div>

      {/* ── Profile card ──────────────────────────────────── */}
      {profile && (
        <div className="nf-card" style={{ marginTop: 0 }}>
          <div className="nf-roblox-info">
            {profile.avatar && (
              <img src={profile.avatar} alt="Roblox avatar" className="nf-roblox-avatar" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#e2e5f0' }}>
                {profile.displayName}
                {profile.isBanned && (
                  <span style={{ fontSize: '0.68rem', background: 'rgba(255,107,122,0.1)', border: '1px solid rgba(255,107,122,0.3)', color: 'rgba(255,107,122,0.8)', borderRadius: 4, padding: '2px 7px', marginLeft: 8, verticalAlign: 'middle' }}>BANNED</span>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(158,165,196,0.5)', marginBottom: 12 }}>
                @{profile.username} · ID: {profile.id}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                {statBox(profile.badgeCount !== null ? `${profile.badgeCount}+` : null, 'Badges')}
                {statBox(profile.friendCount, 'Friends')}
                {statBox(profile.created ? new Date(profile.created).getFullYear() : null, 'Joined')}
              </div>

              {profile.description && (
                <p style={{ fontSize: '0.83rem', color: 'rgba(158,165,196,0.65)', lineHeight: 1.55, margin: 0 }}>
                  {profile.description.length > 300 ? profile.description.slice(0, 300) + '…' : profile.description}
                </p>
              )}
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={`https://www.roblox.com/users/${profile.id}/profile`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '9px 20px', background: 'rgba(0,178,255,0.1)', border: '1px solid rgba(0,178,255,0.35)', color: '#00b2ff', borderRadius: 8, fontSize: '0.83rem', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}
            >
              View on Roblox ↗
            </a>
            {!user && (
              <span style={{ fontSize: '0.78rem', color: 'rgba(158,165,196,0.4)', alignSelf: 'center' }}>
                Sign in to link this to your profile
              </span>
            )}
          </div>

          {profile.fetchedAt && (
            <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'rgba(158,165,196,0.25)' }}>
              Fetched {new Date(profile.fetchedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RobloxTracker;
