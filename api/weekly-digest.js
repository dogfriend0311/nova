// api/weekly-digest.js
//
// Runs on a schedule (see the "crons" entry in vercel.json — Vercel
// invokes this URL for you, nothing to trigger manually) and posts a
// summary of the past 7 days — new articles, POTM awards, season
// accolades, Hall of Fame inductions — to a Discord webhook.
//
// Setup:
//   1. In your Discord server: Server Settings → Integrations →
//      Webhooks → New Webhook → pick the channel → Copy Webhook URL.
//   2. In Vercel: Project Settings → Environment Variables → add
//      DISCORD_DIGEST_WEBHOOK_URL with that URL. (Kept as a server-only
//      env var, not a site setting, so it's never readable by anyone
//      hitting a public API route.)
//   3. Deploy — vercel.json's cron schedule takes it from there.
//
// Uses the same direct-Postgres pattern as api/query.js rather than an
// extra HTTP hop through that endpoint.

import { Pool } from 'pg';

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function safeQuery(client, sql, params) {
  try {
    const { rows } = await client.query(sql, params);
    return rows;
  } catch {
    return []; // a missing/renamed table shouldn't take down the whole digest
  }
}

export default async function handler(req, res) {
  // Vercel Cron sends a GET; allow manual POST testing too, but require
  // the cron secret either way so this can't be spammed by randoms.
  const authHeader = req.headers['authorization'] || '';
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const webhookUrl = process.env.DISCORD_DIGEST_WEBHOOK_URL;
  if (!webhookUrl) {
    res.status(500).json({ error: 'DISCORD_DIGEST_WEBHOOK_URL is not set in Vercel env vars.' });
    return;
  }

  const since = new Date(Date.now() - WEEK_MS).toISOString();
  const client = await getPool().connect();
  let articles = [], potm = [], accolades = [], hof = [];
  try {
    [articles, potm, accolades, hof] = await Promise.all([
      safeQuery(client, `SELECT title, author FROM nova_articles WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 5`, [since]),
      safeQuery(client, `SELECT player_name, league, month_label FROM nova_potm_awards WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 10`, [since]),
      safeQuery(client, `SELECT player_name, league, type, custom_label FROM nova_accolades WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 10`, [since]),
      safeQuery(client, `SELECT player_name, league FROM nova_hof WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 10`, [since]),
    ]);
  } finally {
    client.release();
  }

  const totalItems = articles.length + potm.length + accolades.length + hof.length;
  if (totalItems === 0) {
    res.status(200).json({ skipped: true, reason: 'Nothing new this week — no message sent.' });
    return;
  }

  const fields = [];
  if (articles.length) fields.push({
    name: `📰 New Articles (${articles.length})`,
    value: articles.map(a => `• ${a.title}${a.author ? ` — *${a.author}*` : ''}`).join('\n').slice(0, 1024),
  });
  if (potm.length) fields.push({
    name: `🏆 Player of the Month (${potm.length})`,
    value: potm.map(p => `• ${p.player_name} (${p.league}${p.month_label ? ` · ${p.month_label}` : ''})`).join('\n').slice(0, 1024),
  });
  if (accolades.length) fields.push({
    name: `🎖️ Accolades (${accolades.length})`,
    value: accolades.map(a => `• ${a.player_name} — ${a.type === 'custom' ? (a.custom_label || 'Award') : a.type} (${a.league})`).join('\n').slice(0, 1024),
  });
  if (hof.length) fields.push({
    name: `⭐ Hall of Fame (${hof.length})`,
    value: hof.map(h => `• ${h.player_name} (${h.league})`).join('\n').slice(0, 1024),
  });

  const payload = {
    embeds: [{
      title: '📊 Nova — This Week in the League',
      color: 0x5e81f4,
      fields,
      footer: { text: 'Nova weekly digest' },
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!discordRes.ok) throw new Error(`Discord returned ${discordRes.status}`);
    res.status(200).json({ sent: true, itemCount: totalItems });
  } catch (err) {
    res.status(502).json({ error: 'Failed to post to Discord webhook.' });
  }
}
