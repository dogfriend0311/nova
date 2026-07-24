// api/preview-player.js
//
// Same pattern as preview-member.js, but for individual Roblox Baseball player
// stat pages. Wired up via vercel.json so links to /players/:id show
// that player's name, nickname, team, and position in the preview
// instead of the generic site card.

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://rpdnomdyqgtxhsptnqon.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const SITE_URL = 'https://nova-snow.vercel.app';

const BOT_UA_PATTERN = /bot|facebookexternalhit|twitterbot|discordbot|slackbot|whatsapp|telegrambot|linkedinbot|pinterest|embedly|quora link preview|iframely|vkshare|skypeuripreview|w3c_validator|redditbot|applebot/i;

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function fetchPlayer(id) {
  if (!SUPABASE_ANON_KEY || !id) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/nova_players?id=eq.${encodeURIComponent(id)}&select=*`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.[0] || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const id = req.query.id || '';
  const userAgent = req.headers['user-agent'] || '';
  const isBot = BOT_UA_PATTERN.test(userAgent);
  const appUrl = `${SITE_URL}/#leagues/player/${encodeURIComponent(id)}`;

  if (!isBot) {
    res.writeHead(302, { Location: appUrl });
    res.end();
    return;
  }

  const player = await fetchPlayer(id);
  const name = player?.nickname || player?.player_name || 'Roblox Baseball Player';
  const realName = player?.nickname && player?.player_name ? player.player_name : null;
  const team = player?.team || 'Free Agent';
  const position = player?.position || '';
  const overall = player?.overall || '';

  const descParts = [team];
  if (position) descParts.push(position);
  if (overall) descParts.push(`OVR ${overall}`);
  if (realName) descParts.push(`(${realName})`);
  const bio = descParts.join(' \u00b7 ');

  // avatar_data is stored as a base64 canvas data URI, which crawlers
  // can't fetch as og:image - always fall back to the site default.
  const rawAvatar = player?.avatar_data || '';
  const image = rawAvatar && !rawAvatar.startsWith('data:')
    ? rawAvatar
    : `${SITE_URL}/og-image.png`;

  const title = `${name} - Roblox Baseball`;
  const pageUrl = `${SITE_URL}/players/${encodeURIComponent(id)}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="Nova" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(bio)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:url" content="${escapeHtml(pageUrl)}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(bio)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<meta http-equiv="refresh" content="0; url=${escapeHtml(appUrl)}" />
</head>
<body>
<p>${escapeHtml(title)} - <a href="${escapeHtml(appUrl)}">Open on Nova</a></p>
</body>
</html>`);
}
