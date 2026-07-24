// api/roblox-lookup.js
//
// The Roblox Tracker used to call Roblox's APIs directly from the browser
// through free public CORS proxies (corsproxy.io / allorigins.win). Those
// proxies are unreliable — they rate-limit, go down, or silently hang —
// and the old code had no request timeout, so a stuck proxy request just
// spun the "Loading..." state forever.
//
// This serverless function runs on Vercel, not in the browser, so it can
// call Roblox's APIs directly (no CORS issue) and every fetch has a hard
// timeout. The frontend calls this one endpoint instead of juggling proxies.

const ROBLOX_TIMEOUT_MS = 8000;

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROBLOX_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const username = (req.query.username || '').trim();
  if (!username) {
    res.status(400).json({ error: 'Missing "username" query param.' });
    return;
  }

  try {
    // ── Step 1: username -> userId ─────────────────────────────
    let userId, resolvedUsername, displayName;
    try {
      const postData = await fetchJson('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
      });
      const match = postData?.data?.[0];
      if (!match?.id) throw new Error('not found via v1 endpoint');
      userId = match.id;
      resolvedUsername = match.name;
      displayName = match.displayName || match.name;
    } catch {
      // Fallback: legacy endpoint
      const oldData = await fetchJson(
        `https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(username)}`
      );
      if (!oldData?.Id) {
        res.status(404).json({ error: `User "${username}" not found. Check spelling and try again.` });
        return;
      }
      userId = oldData.Id;
      resolvedUsername = oldData.Username;
      displayName = oldData.Username;
    }

    // ── Step 2-5: run the rest in parallel, each failure-tolerant ──
    const [info, thumb, badges, friends] = await Promise.allSettled([
      fetchJson(`https://users.roblox.com/v1/users/${userId}`),
      fetchJson(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`),
      fetchJson(`https://badges.roblox.com/v1/users/${userId}/badges?limit=10&sortOrder=Desc`),
      fetchJson(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
    ]);

    const infoData = info.status === 'fulfilled' ? info.value : {};
    if (infoData?.name) resolvedUsername = infoData.name;
    if (infoData?.displayName) displayName = infoData.displayName;

    const result = {
      id: userId,
      username: resolvedUsername,
      displayName,
      description: infoData?.description || '',
      created: infoData?.created || null,
      isBanned: infoData?.isBanned || false,
      avatar: thumb.status === 'fulfilled' ? (thumb.value?.data?.[0]?.imageUrl || null) : null,
      badgeCount: badges.status === 'fulfilled' ? (badges.value?.data?.length ?? null) : null,
      friendCount: friends.status === 'fulfilled' ? (friends.value?.count ?? null) : null,
      fetchedAt: new Date().toISOString(),
    };

    res.status(200).json(result);
  } catch (err) {
    res.status(502).json({ error: 'Roblox lookup failed — Roblox\'s API may be temporarily unavailable. Try again in a moment.' });
  }
}
