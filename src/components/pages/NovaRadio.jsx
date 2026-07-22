import React, { useState, useEffect } from 'react';
import './NovaFeatures.css';

const STORAGE_KEY = 'nova_radio_config';
const LISTENERS_KEY = 'nova_radio_listeners';

function getConfig() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
}

function trackListener(username) {
  if (!username) return;
  const data = JSON.parse(localStorage.getItem(LISTENERS_KEY) || '{}');
  data[username] = Date.now();
  localStorage.setItem(LISTENERS_KEY, JSON.stringify(data));
}

function getListeners() {
  try {
    const data = JSON.parse(localStorage.getItem(LISTENERS_KEY) || '{}');
    const cutoff = Date.now() - 5 * 60 * 1000; // 5 min
    return Object.entries(data).filter(([, ts]) => ts > cutoff).map(([u]) => u);
  } catch { return []; }
}

const NovaRadio = ({ user }) => {
  const [config, setConfig] = useState(getConfig);
  const [listeners, setListeners] = useState([]);

  useEffect(() => {
    if (user?.username) trackListener(user.username);
    setListeners(getListeners());
    const id = setInterval(() => {
      if (user?.username) trackListener(user.username);
      setListeners(getListeners());
      // also refresh config in case admin changed it
      setConfig(getConfig());
    }, 30000);
    return () => clearInterval(id);
  }, [user]);

  // Detect embed type and build the correct iframe src
  function buildEmbedSrc(url) {
    if (!url) return null;
    // Already an embed URL
    if (url.includes('/embed/')) return url;
    // Spotify playlist/album/track
    if (url.includes('open.spotify.com')) {
      return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
    }
    // Apple Music
    if (url.includes('music.apple.com') && !url.includes('embed.music')) {
      return url.replace('music.apple.com', 'embed.music.apple.com');
    }
    // YouTube
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&loop=1&playlist=${ytMatch[1]}`;
    }
    return url;
  }

  const embedSrc = buildEmbedSrc(config?.embedUrl);
  const isSpotify = embedSrc?.includes('spotify');
  const isApple = embedSrc?.includes('apple');
  const isYoutube = embedSrc?.includes('youtube');

  return (
    <div className="page nf-page">
      <div className="nf-header">
        <h1>📻 Nova Radio</h1>
        <p>Community music — plays 24/7 while the tab is open</p>
      </div>

      {!config ? (
        <div className="nf-card">
          <div className="nf-empty">
            🎵 No playlist configured yet.<br />
            <span style={{ fontSize: '0.78rem', marginTop: 8, display: 'block' }}>
              An admin can set a playlist in the Owner Dashboard → Radio tab.
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="nf-card nf-radio-embed">
            {embedSrc && (
              <iframe
                src={embedSrc}
                width="100%"
                height={isSpotify ? 352 : isApple ? 450 : 315}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                title="Nova Radio"
                style={{ display: 'block' }}
              />
            )}
          </div>

          <div className="nf-card">
            <div className="nf-radio-info">
              <div className="nf-live-dot" />
              <div>
                <div style={{ fontWeight: 700, color: '#e2e5f0', fontSize: '1rem' }}>
                  {config.name || 'Nova Radio'}
                </div>
                {config.description && (
                  <div style={{ color: 'rgba(158,165,196,0.6)', fontSize: '0.82rem', marginTop: 2 }}>
                    {config.description}
                  </div>
                )}
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '0.82rem', color: 'rgba(158,165,196,0.5)' }}>
                  {listeners.length} listening
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.35)', marginTop: 2 }}>
                  {isSpotify ? '🎵 Spotify' : isApple ? '🍎 Apple Music' : isYoutube ? '▶ YouTube' : '🎵 Music'}
                </div>
              </div>
            </div>

            {listeners.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {listeners.map(u => (
                  <span key={u} style={{
                    padding: '3px 10px', background: 'rgba(94,129,244,0.08)',
                    border: '1px solid rgba(94,129,244,0.2)', borderRadius: 999,
                    fontSize: '0.75rem', color: 'rgba(158,165,196,0.7)'
                  }}>
                    {u}
                  </span>
                ))}
              </div>
            )}
          </div>

          {config.addedBy && (
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(158,165,196,0.3)', marginTop: 4 }}>
              Playlist set by @{config.addedBy}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NovaRadio;
