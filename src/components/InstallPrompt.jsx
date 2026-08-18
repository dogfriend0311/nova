import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

// ── PWA install prompt ─────────────────────────────────────────
// Chrome/Edge/Android fire a "beforeinstallprompt" event when the site
// meets install criteria (HTTPS + manifest + a registered service worker).
// The browser does NOT show its own UI for this automatically — you have
// to capture that event, stash it, and trigger prompt() from your own
// button. This component is that button: a small dismissible banner that
// appears once the browser says installing is possible, and calls the
// native install dialog when tapped. (Safari/iOS never fires this event —
// there, "Add to Home Screen" is a manual step from the Share sheet, so
// the banner simply never appears there, which is expected.)

const DISMISS_KEY = 'nova_install_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // don't re-nag for a week

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
      if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Already running as an installed PWA — never show the banner.
    if (window.matchMedia('(display-mode: standalone)').matches) setVisible(false);

    window.addEventListener('appinstalled', () => setVisible(false));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const install = async () => {
    setVisible(false);
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => {});
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 900,
      maxWidth: 420, margin: '0 auto',
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'linear-gradient(135deg, rgba(19,23,41,0.97), rgba(10,13,26,0.97))',
      border: '1px solid rgba(94,129,244,0.35)', borderRadius: 14,
      padding: '12px 14px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'rgba(94,129,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Download size={18} color="var(--color-cyan)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#e2e5f0' }}>Install Nova</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(158,165,196,0.6)' }}>Add it to your home screen for quick, full-screen access.</div>
      </div>
      <button onClick={install} className="neon-button" style={{ padding: '7px 14px', fontSize: '0.78rem', flexShrink: 0 }}>
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', color: 'rgba(158,165,196,0.4)', cursor: 'pointer', flexShrink: 0, padding: 4 }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default InstallPrompt;
