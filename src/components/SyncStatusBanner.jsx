import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { checkBackendHealth } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

// ── Sync status banner ──────────────────────────────────────────
// Every read/write of teams/players/etc in db.js tries the shared
// database first and falls back to this browser's own localStorage
// if that call fails — silently, by design, so the app still works
// offline. The trade-off: if the backend is misconfigured (no
// DATABASE_URL, DB unreachable, migration not run), everything you
// create only ever lands in your own browser and nobody else ever
// sees it — with no error anywhere telling you that's happening.
// This checks the backend once per session and says so plainly,
// specifically to whoever can actually fix it (owner/cofounder/mod).
const SyncStatusBanner = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null); // null = checking, {ok, error}
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkBackendHealth().then((result) => {
      if (!cancelled) setStatus(result);
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error('[SyncStatusBanner] backend health check failed:', result.error);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const canFix = user && ['owner', 'cofounder', 'mod'].includes(user.role);
  if (!status || status.ok || dismissed || !canFix) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1001,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      padding: '10px 16px', textAlign: 'center', flexWrap: 'wrap',
      background: 'linear-gradient(90deg, #7a4a1f, #5e3a20)',
      color: '#ffe9d0', fontSize: '0.8rem', fontWeight: 700,
      boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      <span>
        Not connected to the shared database — teams/players/edits made right now will
        only show up on this device, not for anyone else, until this is fixed.
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: 'transparent', border: 'none', color: '#ffe9d0',
          cursor: 'pointer', padding: 4, display: 'flex',
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
};

export default SyncStatusBanner;
