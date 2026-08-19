// api/weekly-digest.js
//
// Runs on a schedule (see the "crons" entry in vercel.json — Vercel
// invokes this URL for you, nothing to trigger manually) and posts a
// summary of the past 7 days — new articles, POTM awards, season
// accolades, Hall of Fame inductions, new member pages, Roblox league
// scores, and a leaderboard snapshot — to a Discord webhook.
//
// Schedule note: Vercel Cron runs in UTC and does not observe DST.
// "0 8 * * 1" is midnight PST (UTC-8). During Pacific Daylight Time
// (UTC-7, roughly March–November) it will fire at 1am PDT instead of
// midnight — Vercel cron has no timezone-aware option, so bumping this
// forward an hour twice a year is the only fix if exact-midnight
// matters year-round.
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
const ROBLOX_LEAGUES = ['vizta', 'hockey', 'football'];
const LEAGUE_LABEL = { vizta: 'Roblox Baseball', hockey: 'Roblox Hockey', football: 'Heavenly Football' };

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
  let articles = [], potm = [], accolades = [], hof = [], newMembers = [], boxScores = [];
  try {
    [articles, potm, accolades, hof, newMembers] = await Promise.all([
      safeQuery(client, `SELECT title, author FROM nova_articles WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 5`, [since]),
      safeQuery(client, `SELECT player_name, league, month_label FROM nova_potm_awards WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 10`, [since]),
      safeQuery(client, `SELECT player_name, league, type, custom_label FROM nova_accolades WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 10`, [since]),
      safeQuery(client, `SELECT player_name, league FROM nova_hof WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 10`, [since]),
      safeQuery(client, `SELECT username FROM nova_member_profiles WHERE created_at >= $1 ORDER BY created_at DESC LIMIT 10`, [since]),
    ]);

    // Roblox league game results posted this week, across all 3 in-house
    // leagues. Each league's games live in the same nova_games table,
    // partitioned by the `league` column.
    const gamesPerLeague = await Promise.all(
      ROBLOX_LEAGUES.map(lg => safeQuery(
        client,
        `SELECT home_team, away_team, home_score, away_score, game_date FROM nova_games WHERE league = $1 AND status = 'final' AND updated_at >= $2 ORDER BY game_date DESC LIMIT 5`,
        [lg, since]
      ).then(rows => rows.map(r => ({ ...r, league: lg }))))
    );
    boxScores = gamesPerLeague.flat();

    // Leaderboard snapshot — top player in a couple of headline stats per
    // league, as of the moment the digest runs (not a delta from last week).
    var leaderboards = {};
    for (const lg of ROBLOX_LEAGUES) {
      if (lg === 'vizta') {
        leaderboards[lg] = {
          'Home Runs': (await safeQuery(client, `SELECT player_name, season_home_runs AS val FROM nova_players WHERE league=$1 ORDER BY season_home_runs DESC NULLS LAST LIMIT 3`, [lg])),
          'Batting Avg': (await safeQuery(client, `SELECT player_name, season_avg AS val FROM nova_players WHERE league=$1 ORDER BY season_avg DESC NULLS LAST LIMIT 3`, [lg])),
        };
      } else if (lg === 'hockey') {
        leaderboards[lg] = {
          'Points': (await safeQuery(client, `SELECT player_name, season_points AS val FROM nova_players WHERE league=$1 ORDER BY season_points DESC NULLS LAST LIMIT 3`, [lg])),
        };
      } else if (lg === 'football') {
        leaderboards[lg] = {
          'Total TDs': (await safeQuery(client, `SELECT player_name, season_total_td AS val FROM nova_players WHERE league=$1 ORDER BY season_total_td DESC NULLS LAST LIMIT 3`, [lg])),
        };
      }
    }
  } finally {
    client.release();
  }

  const totalItems = articles.length + potm.length + accolades.length + hof.length + newMembers.length + boxScores.length;
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
  if (newMembers.length) fields.push({
    name: `👤 New Member Pages (${newMembers.length})`,
    value: newMembers.map(m => `• ${m.username}`).join('\n').slice(0, 1024),
  });
  if (boxScores.length) fields.push({
    name: `🎮 Roblox League Scores (${boxScores.length})`,
    value: boxScores.map(b => `• ${LEAGUE_LABEL[b.league] || b.league}: ${b.away_team} ${b.away_score ?? '—'} @ ${b.home_team} ${b.home_score ?? '—'}`).join('\n').slice(0, 1024),
  });
  for (const lg of ROBLOX_LEAGUES) {
    const stats = leaderboards[lg] || {};
    const lines = Object.entries(stats)
      .filter(([, rows]) => rows.length)
      .map(([statLabel, rows]) => `**${statLabel}:** ${rows.map((r, i) => `${i + 1}. ${r.player_name} (${r.val})`).join(', ')}`);
    if (lines.length) fields.push({
      name: `📈 ${LEAGUE_LABEL[lg]} Leaderboard`,
      value: lines.join('\n').slice(0, 1024),
    });
  }

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

