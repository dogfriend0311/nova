// api/discord-notify.js
//
// Real-time Discord auto-posting for site events (POTM, accolades, Hall of
// Fame, new articles, ...) — a live companion to api/weekly-digest.js's
// weekly summary. Called from the client the instant one of these events
// is created (see src/services/discordEventNotify.js + the call sites in
// src/services/db.js: addHof, addPotmAward, addAccolade, saveArticle).
//
// The webhook URL never reaches the browser: the client POSTs a small,
// allow-listed event payload here, and this route — running server-side —
// looks up the webhook URL and builds the actual Discord embed itself.
// That also means a client can't post arbitrary text to the channel; it
// can only trigger one of the templates below.
//
// Setup:
//   1. In Discord: Server Settings → Integrations → Webhooks → New
//      Webhook → pick the channel (can be the same one weekly-digest
//      posts to, or a separate #announcements channel) → Copy Webhook URL.
//   2. In Vercel: Project Settings → Environment Variables → add
//      DISCORD_EVENTS_WEBHOOK_URL with that URL.
//      If it's not set, this falls back to DISCORD_DIGEST_WEBHOOK_URL so
//      events still post somewhere without extra setup — set
//      DISCORD_EVENTS_WEBHOOK_URL explicitly if you want live events and
//      the weekly digest going to different channels.
//   3. Deploy. No cron entry needed — this route is hit directly by the
//      browser, not on a schedule.

const MAX_LEN = 256; // Discord embed field/title limits are generous, but keep our own values sane

function clip(str, max = MAX_LEN) {
  const s = String(str ?? '').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// Each entry builds a Discord embed from a small, known payload shape.
// Anything not listed here is rejected — the client cannot supply its own
// title/body/color and get it posted verbatim.
const TEMPLATES = {
  hof: ({ player_name, league }) => ({
    title: '⭐ Hall of Fame',
    description: `**${clip(player_name || 'A player')}** was just inducted into the Hall of Fame!`,
    color: 0xf5c518,
    footer: league ? clip(league.toUpperCase()) : undefined,
  }),
  potm: ({ player_name, league, month_label }) => ({
    title: '🏆 Player of the Month',
    description: `**${clip(player_name || 'A player')}** just won Player of the Month${month_label ? ` (${clip(month_label)})` : ''}.`,
    color: 0x5e81f4,
    footer: league ? clip(league.toUpperCase()) : undefined,
  }),
  accolade: ({ player_name, league, label }) => ({
    title: '🎖️ New Accolade',
    description: `**${clip(player_name || 'A player')}** earned ${clip(label || 'an award')}.`,
    color: 0x9b59b6,
    footer: league ? clip(league.toUpperCase()) : undefined,
  }),
  article: ({ title, author }) => ({
    title: '📰 New Article',
    description: `**${clip(title || 'Untitled')}**${author ? `\n— ${clip(author)}` : ''}`,
    color: 0x2ecc71,
  }),
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const webhookUrl = process.env.DISCORD_EVENTS_WEBHOOK_URL || process.env.DISCORD_DIGEST_WEBHOOK_URL;
  if (!webhookUrl) {
    // Not configured — succeed quietly so the caller (fire-and-forget on
    // the client) doesn't need to special-case "Discord isn't set up yet".
    res.status(200).json({ skipped: true, reason: 'No Discord webhook configured.' });
    return;
  }

  const { event, ...payload } = req.body || {};
  const build = TEMPLATES[event];
  if (!build) {
    res.status(400).json({ error: `Unknown event type: ${event}` });
    return;
  }

  const embed = build(payload);
  embed.footer = embed.footer ? { text: embed.footer } : undefined;
  embed.timestamp = new Date().toISOString();

  try {
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!discordRes.ok) throw new Error(`Discord returned ${discordRes.status}`);
    res.status(200).json({ sent: true });
  } catch (err) {
    // Never surface this as a hard failure to the site — a missed Discord
    // post shouldn't roll back or error out the award/article/etc. that
    // triggered it.
    res.status(502).json({ error: 'Failed to post to Discord webhook.' });
  }
}
