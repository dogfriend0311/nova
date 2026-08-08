// Server-side proxy for the public MLB Stats API.
// MLB responses are fetched here so the browser never needs to make a
// cross-origin request directly to statsapi.mlb.com in production.

export default async function handler(req, res) {
  const { path, ...rest } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : (path || '');

  if (!pathStr || pathStr.includes('://') || pathStr.includes('..')) {
    return res.status(400).json({ error: 'Invalid MLB path' });
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rest)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value !== undefined) {
      params.append(key, value);
    }
  }

  const qs = params.toString();
  const makeTarget = (version) =>
    `https://statsapi.mlb.com/api/${version}/${pathStr}${qs ? `?${qs}` : ''}`;

  try {
    let upstream = await fetch(makeTarget('v1'));
    // Some MLB live-feed deployments expose the same feed under v1.1.
    if (upstream.status === 404 && pathStr.startsWith('game/')) {
      upstream = await fetch(makeTarget('v1.1'));
    }
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    res.send(body);
  } catch (err) {
    res.status(502).json({ error: 'MLB proxy request failed', message: err.message });
  }
}