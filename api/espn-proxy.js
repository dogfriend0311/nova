// api/espn-proxy.js
//
// Your frontend calls /espn-proxy/apis/site/v2/sports/... instead of
// ESPN's API directly, because browsers calling ESPN's API straight from
// a webpage often get blocked (CORS). This function runs on Vercel's
// servers (not in the browser), so it can call ESPN directly and just
// hand the response back to your site.

export default async function handler(req, res) {
  const { path, ...rest } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : (path || '');

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rest)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value !== undefined) {
      params.append(key, value);
    }
  }
  const qs = params.toString();

  const targetUrl = `https://site.api.espn.com/${pathStr}${qs ? `?${qs}` : ''}`;

  try {
    const espnRes = await fetch(targetUrl);
    const body = await espnRes.text();
    res.status(espnRes.status);
    res.setHeader('Content-Type', espnRes.headers.get('content-type') || 'application/json');
    res.send(body);
  } catch (err) {
    res.status(502).json({ error: 'ESPN proxy request failed', message: err.message });
  }
}
