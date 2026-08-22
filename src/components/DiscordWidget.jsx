import React, { useEffect, useState } from 'react';
import discordService from '../services/discordService';

const DISCORD_INVITE_URL = 'https://discord.gg/B2c7Gsks9p';

const DiscordMark = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M20.32 4.87A19.8 19.8 0 0 0 15.66 3.4a.07.07 0 0 0-.08.04c-.2.36-.43.83-.59 1.2a18.3 18.3 0 0 0-5.5 0 12 12 0 0 0-.6-1.2.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.66 1.47.07.07 0 0 0-.03.03C1.2 9.1.44 13.19.81 17.23a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 6 3.04.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-2a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.13c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08 0c3.93 1.8 8.18 1.8 12.06 0a.07.07 0 0 1 .08 0c.12.1.24.2.37.3a.08.08 0 0 1 0 .12c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.1c.37.72.78 1.39 1.23 2.01a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6.01-3.04.08.08 0 0 0 .03-.06c.44-4.67-.74-8.72-3.14-12.33a.06.06 0 0 0-.03-.03ZM8.68 14.8c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.41 2.15-2.41 1.21 0 2.17 1.09 2.15 2.41 0 1.32-.94 2.4-2.15 2.4Zm6.65 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.41 2.15-2.41 1.21 0 2.17 1.09 2.15 2.41 0 1.32-.93 2.4-2.15 2.4Z" />
  </svg>
);

const STATUS_COLOR = { online: '#43b581', idle: '#faa61a', dnd: '#f04747' };

// ── Discord Widget ───────────────────────────────────────────
// Shows a live "X online in Discord" count, pulled straight from
// Discord's own public widget.json for the server (see discordService.js
// for the one-time setup this needs). Renders nothing if the guild ID
// isn't configured or Discord's widget is turned off — so it fails
// quietly rather than showing a broken box.
const DiscordWidget = () => {
  const [widget, setWidget] = useState(null); // null = loading/unavailable

  useEffect(() => {
    if (!discordService.isConfigured()) return;
    let active = true;
    const load = () => discordService.getWidget().then((data) => { if (active) setWidget(data); });
    load();
    const interval = setInterval(load, 60000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  if (!widget) return null;

  const shownMembers = (widget.members || []).slice(0, 8);

  return (
    <a
      href={widget.instant_invite || DISCORD_INVITE_URL}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
        background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.28)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 20,
      }}
    >
      <span style={{ color: '#5865f2', flexShrink: 0 }}><DiscordMark /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e5f0' }}>
          <span style={{ color: '#43b581' }}>●</span>&nbsp;{widget.presence_count} online in Discord
        </div>
        {shownMembers.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {shownMembers.map((m) => (
              <div
                key={m.id || m.username}
                title={m.username}
                style={{
                  width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', position: 'relative',
                  border: `1.5px solid ${STATUS_COLOR[m.status] || '#747f8d'}`, flexShrink: 0,
                  background: 'rgba(94,129,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', color: '#e2e5f0',
                }}
              >
                {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.username?.[0]?.toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>
      <span style={{ fontSize: '0.78rem', color: '#5865f2', flexShrink: 0 }}>Join &#8599;</span>
    </a>
  );
};

export default DiscordWidget;
