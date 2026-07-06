// api/preview-member.js
//
// Solves the "link preview just shows the generic site" problem.
// Nova's router is hash-based (#members/username), and hash fragments
// never reach the server - so Discord/iMessage/Slack/Twitter bots that
// fetch a shared link can never see which profile it's for, only the
// generic index.html.
//
// This function is wired up via vercel.json rewrites to handle real
// paths like /members/somebody instead:
//   - If the request is from a known link-preview bot, it returns a
//     tiny static HTML page with THAT PERSON'S name/bio baked into the
//     Open Graph meta tags, so the preview card shows something useful.
//   - If the request is from a normal human browser, it 302-redirects
//     straight into the real app (#members/somebody) so nothing about
//     the app itself needs to change.

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://rpdnomdyqgtxhsptnqon.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const SITE_URL = 'https://nova-snow.vercel.app';

const BOT_UA_PATTERN = /bot|facebookexternalhit|twitterbot|discordbot|slackbot|whatsapp|telegrambot|linkedinbot|pinterest|embedly|quora link preview|iframely|vkshare|skypeuripreview|w3c_validator|redditbot|applebot/i;

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function fetchProfile(username) {
  if (!SUPABASE_ANON_KEY || !username) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/nova_member_profiles?username=eq.${encodeURIComponent(username)}&select=*`;
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
  const username = req.query.username || '';
  const userAgent = req.headers['user-agent'] || '';
  const isBot = BOT_UA_PATTERN.test(userAgent);
  const appUrl = `${SITE_URL}/#members/${encodeURIComponent(username)}`;

  if (!isBot) {
    res.writeHead(302, { Location: appUrl });
    res.end();
    return;
  }

  const profile = await fetchProfile(username);
  const displayName = profile?.username || username || 'Nova Member';
  const bio = profile?.bio
    ? profile.bio.slice(0, 160)
    : `View ${displayName}'s profile on Nova - clips, favorite games, and more.`;

  // Base64 data-URI avatars can't be used as og:image (crawlers need a
  // real fetchable URL), so fall back to the site's default share image.
  const rawAvatar = profile?.avatar_url || '';
  const image = rawAvatar && !rawAvatar.startsWith('data:')
    ? rawAvatar
    : `${SITE_URL}/og-image.png`;

  const title = `${displayName} on Nova`;
  const pageUrl = `${SITE_URL}/members/${encodeURIComponent(username)}`;

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
