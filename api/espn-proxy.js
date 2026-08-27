// api/espn-proxy.js
//
// Your frontend calls /espn-proxy/apis/site/v2/sports/... instead of
// ESPN's API directly, because browsers calling ESPN's API straight from
// a webpage often get blocked (CORS). This function runs on Vercel's
// servers (not in the browser), so it can call ESPN directly and just
// hand the response back to your site.
//
// ESPN's public data is actually spread across several hosts (site API,
// the web/search API, the "core" API, and the CDN-optimized scoreboard).
// The frontend can request any of them through this one proxy by adding
// ?host=<one of the names below> — default stays site.api.espn.com so
// every existing call site keeps working unchanged.
const ALLOWED_HOSTS = new Set([
  'site.api.espn.com',       // scores, teams, standings, news (site-facing)
  'site.web.api.espn.com',   // search, richer athlete profiles/overview/splits/gamelog
  'sports.core.api.espn.com',// athletes, leaders, odds, play-by-play, situation, predictor
  'cdn.espn.com',            // CDN-optimized live scoreboard/game package
]);

export default async function handler(req, res) {
  const { path, host, ...rest } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : (path || '');
  const hostStr = Array.isArray(host) ? host[0] : host;
  const targetHost = ALLOWED_HOSTS.has(hostStr) ? hostStr : 'site.api.espn.com';

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rest)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value !== undefined) {
      params.append(key, value);
    }
  }
  const qs = params.toString();

  // Only proxy ESPN paths. This prevents the function from becoming an
  // unrestricted outbound request endpoint.
  if (!pathStr || pathStr.includes('://') || pathStr.includes('..')) {
    return res.status(400).json({ error: 'Invalid ESPN path' });
  }

  const targetUrl = `https://${targetHost}/${pathStr}${qs ? `?${qs}` : ''}`;

  try {
    const espnRes = await fetch(targetUrl);
    const body = await espnRes.text();
    res.status(espnRes.status);
    res.setHeader('Content-Type', espnRes.headers.get('content-type') || 'application/json');
    // Live scores/standings/news change constantly — never let a browser,
    // proxy, or CDN cache this response.
    res.setHeader('Cache-Control', 'no-store');
    res.send(body);
  } catch (err) {
    res.status(502).json({ error: 'ESPN proxy request failed', message: err.message });
  }
}
