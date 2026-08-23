import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

// ── Offline banner ──────────────────────────────────────────────
// sw.js serves the cached app shell when the network is unavailable, so
// the app doesn't go blank — but scores, standings, chat, etc. still need
// a live connection. Without this, "offline" just looks like everything
// silently failing to load. This tells the person what's going on and
// clears itself the moment the connection comes back.

const OfflineBanner = () => {
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '8px 12px', textAlign: 'center',
      background: 'linear-gradient(90deg, #7a1f1f, #5e2020)',
      color: '#ffe0e0', fontSize: '0.8rem', fontWeight: 700,
      boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
    }}>
      <WifiOff size={14} />
      You're offline — showing cached content. Some features won't work until you're back online.
    </div>
  );
};

export default OfflineBanner;
