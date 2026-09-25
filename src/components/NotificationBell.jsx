import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Volume2, VolumeX } from 'lucide-react';
import db from '../services/db';
import { useAuth } from '../context/AuthContext';

// ── Notifications ────────────────────────────────────────────
// Unified notification center: this single bell + nova_notifications
// table is now the landing spot for every previously-separate alert
// system — profile comments, DMs, player-follower awards (HOF/POTM/
// accolades), badge unlocks, coin rewards (daily login + staff grants),
// and site-wide Staff of the Month announcements. Anything that wants
// to notify a member should call db.createNotification(username, {...})
// (or db.broadcastNotification({...}) for an all-members announcement)
// rather than inventing a new, separate alert surface.
//
// This is in-app notifications + on-screen desktop notifications while
// the site is OPEN in a tab — not true push (delivery while the site
// is fully closed). Real push needs a service-worker push subscription,
// VAPID keys, and a backend that holds those subscriptions and sends
// to them — a separate, heavier piece of infrastructure. What's here
// covers the common case (get notified about a DM or comment while
// you're browsing the site, even a different tab/page) using:
//   1. A polled unread count + dropdown list (always works).
//   2. The browser's native Notification API, IF the member opts in —
//      shows an OS-level popup even if Nova isn't the focused tab.

const POLL_MS = 20000;

const soundKey = (username) => `nova_notif_sound_${username}`;

// A short, pleasant two-note chime synthesized with the Web Audio API —
// no audio file to bundle/host, and it works offline. Plays at most once
// per poll cycle (not once per notification) so a burst of messages
// doesn't turn into a stack of overlapping beeps.
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const note = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    };
    note(880, 0, 0.12);
    note(1318.5, 0.1, 0.18);
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch { /* ignore — sound is a nice-to-have, never block notifications on it */ }
}

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const ICONS = { dm: '💬', comment: '📝', award: '🏆', stats: '📊', score: '⚡', news: '📰', badge: '🎖️', coins: '💰', staff: '⭐' };

const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [browserEnabled, setBrowserEnabled] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const seenIds = useRef(new Set());
  const rootRef = useRef(null);

  // Load the per-user sound preference once we know who's logged in
  // (default on — the toggle is for turning it off, not opting in).
  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(soundKey(user.username));
    setSoundEnabled(saved === null ? true : saved === 'true');
  }, [user]);

  const toggleSound = () => {
    if (!user) return;
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(soundKey(user.username), String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!user || user.role === 'guest') return;
    const poll = async () => {
      const list = await db.getNotifications(user.username, 30).catch(() => []);
      const unreadList = list.filter(n => !n.read_at);
      setUnread(unreadList.length);
      setItems(list);

      // New-since-last-poll items — used for both the desktop notification
      // and the sound, which are independent toggles (you can have one
      // without the other).
      const freshItems = unreadList.filter(n => !seenIds.current.has(n.id));
      freshItems.forEach(n => seenIds.current.add(n.id));

      if (browserEnabled) {
        freshItems.forEach(n => {
          try { new Notification(n.title, { body: n.body || '', tag: String(n.id) }); } catch { /* ignore */ }
        });
      }
      // Skip the chime on the very first poll after opening the app —
      // otherwise every pre-existing unread notification "arrives" at once.
      if (soundEnabled && freshItems.length > 0 && seenIds.current.size > freshItems.length) {
        playChime();
      }
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [user, browserEnabled, soundEnabled]);

  useEffect(() => {
    const onClickOutside = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!user || user.role === 'guest') return null;

  const requestBrowserPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setBrowserEnabled(perm === 'granted');
  };

  const openItem = async (n) => {
    setOpen(false);
    if (n.link) window.location.hash = n.link;
    if (unread > 0) {
      await db.markNotificationsRead(user.username);
      setUnread(0);
      setItems(prev => prev.map(i => ({ ...i, read_at: i.read_at || new Date().toISOString() })));
    }
  };

  const markAllRead = async () => {
    await db.markNotificationsRead(user.username);
    setUnread(0);
    setItems(prev => prev.map(i => ({ ...i, read_at: i.read_at || new Date().toISOString() })));
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        className="user-button"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        title="Notifications"
        style={{ position: 'relative' }}
      >
        {unread > 0 ? <BellRing size={17} /> : <Bell size={17} />}
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7,
            background: 'var(--color-magenta)', color: '#fff', fontSize: '0.58rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, width: 320, maxHeight: 420, overflowY: 'auto', zIndex: 1200,
          background: 'linear-gradient(160deg, #131729, #0a0d1a)', border: '1px solid rgba(94,129,244,0.3)',
          borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(94,129,244,0.12)' }}>
            <strong style={{ color: '#e2e5f0', fontSize: '0.85rem' }}>Notifications</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={toggleSound}
                title={soundEnabled ? 'Mute notification sound' : 'Unmute notification sound'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: soundEnabled ? 'var(--color-cyan)' : 'rgba(158,165,196,0.45)', display: 'flex' }}
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
              {unread > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', fontSize: '0.72rem', cursor: 'pointer' }}>Mark all read</button>}
            </div>
          </div>

          {!browserEnabled && typeof Notification !== 'undefined' && Notification.permission !== 'denied' && (
            <button onClick={requestBrowserPermission} style={{
              width: '100%', textAlign: 'left', padding: '10px 14px', background: 'rgba(94,129,244,0.06)',
              border: 'none', borderBottom: '1px solid rgba(94,129,244,0.1)', color: 'rgba(158,165,196,0.7)', fontSize: '0.76rem', cursor: 'pointer',
            }}>
              🔔 Enable desktop alerts for new messages
            </button>
          )}

          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'rgba(158,165,196,0.4)', fontSize: '0.82rem' }}>No notifications yet.</div>
          ) : items.map(n => (
            <button
              key={n.id}
              onClick={() => openItem(n)}
              style={{
                width: '100%', display: 'flex', gap: 10, padding: '10px 14px', textAlign: 'left',
                background: n.read_at ? 'none' : 'rgba(94,129,244,0.08)', border: 'none',
                borderBottom: '1px solid rgba(94,129,244,0.06)', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{ICONS[n.type] || '🔔'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e2e5f0', fontSize: '0.8rem', fontWeight: n.read_at ? 600 : 800 }}>{n.title}</div>
                {n.body && <div style={{ color: 'rgba(158,165,196,0.5)', fontSize: '0.74rem', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>}
                <div style={{ color: 'rgba(158,165,196,0.35)', fontSize: '0.66rem', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
