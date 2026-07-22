import React, { useState, useEffect } from 'react';
import '../styles/NovaFeatures.css';
import { awardBadge } from '../../services/achievementsService';

const STORAGE_KEY = (username) => `nova_roblox_${username}`;

// ── CORS proxy list — tried in order until one works ─────────
const PROXIES = [
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

async function proxyFetch(url, opts = {}) {
  let lastErr;
  for (const makeProxy of PROXIES) {
    try {
      const res = await fetch(makeProxy(url), opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('All proxies failed');
}

// ── POST via corsproxy.io (supports body forwarding) ─────────
async function proxyPost(url, body) {
  const proxied = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxied, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST failed: HTTP ${res.status}`);
  return res;
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
      // ── Step 1: Resolve username → user ID ──────────────
      // Primary: new Roblox POST endpoint (v1/usernames/users)
      let userId, username, displayName;

      try {
        const postRes = await proxyPost(
          'https://users.roblox.com/v1/usernames/users',
          { usernames: [uname], excludeBannedUsers: false }
        );
        const postData = await postRes.json();
        const user0 = postData?.data?.[0];
        if (!user0 || !user0.id) throw new Error('User not found via new API');
        userId      = user0.id;
        username    = user0.name;
        displayName = user0.displayName || user0.name;
      } catch (newApiErr) {
        // Fallback: old endpoint (deprecated but sometimes still works)
        try {
          const oldRes  = await proxyFetch(`https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(uname)}`);
          const oldData = await oldRes.json();
          if (oldData.errorMessage || !oldData.Id) throw new Error(oldData.errorMessage || 'User not found');
          userId      = oldData.Id;
          username    = oldData.Username;
          displayName = oldData.Username;
        } catch {
          throw new Error(`User "${uname}" not found. Check spelling and try again.`);
        }
      }

      // ── Step 2: Get full user info ───────────────────────
      let description = '', created = null, isBanned = false;
      try {
        const infoRes  = await proxyFetch(`https://users.roblox.com/v1/users/${userId}`);
        const info     = await infoRes.json();
        description = info.description || '';
        created     = info.created || null;
        isBanned    = info.isBanned || false;
        // The v1/users/:id endpoint also returns name/displayName — use them as the source of truth
        if (info.name)        username    = info.name;
        if (info.displayName) displayName = info.displayName;
      } catch {}

      // ── Step 3: Avatar thumbnail ─────────────────────────
      let avatar = null;
      try {
        const thumbRes  = await proxyFetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`);
        const thumbData = await thumbRes.json();
        avatar = thumbData?.data?.[0]?.imageUrl || null;
      } catch {}

      // ── Step 4: Badge count ──────────────────────────────
      let badgeCount = null;
      try {
        const badgeRes  = await proxyFetch(`https://badges.roblox.com/v1/users/${userId}/badges?limit=10&sortOrder=Desc`);
        const badgeData = await badgeRes.json();
        badgeCount = badgeData?.data?.length ?? null;
      } catch {}

      // ── Step 5: Friend count ─────────────────────────────
      let friendCount = null;
      try {
        const friendRes  = await proxyFetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
        const friendData = await friendRes.json();
        friendCount = friendData?.count ?? null;
      } catch {}

      const result = {
        id: userId,
        username,
        displayName,
        description,
        created,
        isBanned,
        avatar,
        badgeCount,
        friendCount,
        fetchedAt: new Date().toISOString(),
      };

      setProfile(result);

      // Link to Nova account
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
