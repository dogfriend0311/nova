// src/context/NowPlayingContext.jsx
//
// Nova Music's "now playing" bar used to live inside the Music tab's own
// component tree, so navigating to any other page (Home, Sports, etc.)
// unmounted it — killing the YouTube embed that actually produces the
// audio. This context mounts the real player + bar at the App root,
// outside the page-switching logic, so it survives navigation the way a
// normal mini-player ("the iPod") should. Nova Music itself just calls
// play()/stop() from useNowPlaying() instead of holding its own state.
import React, { createContext, useContext, useState, useCallback } from 'react';
import './nowPlaying.css';

const NowPlayingContext = createContext(null);

export function NowPlayingProvider({ children }) {
  const [current, setCurrent] = useState(null); // { videoId, title, subtitle, thumbnail }

  const play = useCallback((videoId, title, extra = {}) => {
    if (!videoId) return;
    setCurrent({ videoId, title, ...extra });
  }, []);
  const stop = useCallback(() => setCurrent(null), []);

  return (
    <NowPlayingContext.Provider value={{ current, play, stop }}>
      {children}
      <GlobalNowPlayingBar current={current} onClose={stop} />
    </NowPlayingContext.Provider>
  );
}

export function useNowPlaying() {
  const ctx = useContext(NowPlayingContext);
  if (!ctx) throw new Error('useNowPlaying must be used within a NowPlayingProvider');
  return ctx;
}

function GlobalNowPlayingBar({ current, onClose }) {
  if (!current) return null;
  return (
    <div className="global-nowplaying">
      <div className="global-nowplaying-frame">
        <iframe
          key={current.videoId}
          src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1`}
          title={current.title || 'Now playing'}
          allow="autoplay; encrypted-media"
          allowFullScreen
          frameBorder="0"
        />
      </div>
      <div className="global-nowplaying-main">
        <div className="global-nowplaying-title">{current.title}</div>
        {current.subtitle && <div className="global-nowplaying-sub">{current.subtitle}</div>}
      </div>
      <button className="global-nowplaying-close" onClick={onClose} title="Stop">✕</button>
    </div>
  );
}
