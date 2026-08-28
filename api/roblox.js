// api/roblox.js
//
// Consolidates what used to be three separate serverless functions
// (roblox-lookup.js, roblox-game-status.js, roblox-game-thumb.js) into
// one, routed by an `action` query param — exactly the same pattern as
// api/ytmusic.py. This exists purely to stay under Vercel's Hobby-plan
// cap of 12 serverless functions per deployment; the actual Roblox
// lookup logic below is unchanged from the original three files.
//
// GET /api/roblox?action=lookup&username=...
// GET /api/roblox?action=game-status&placeId=...
// GET /api/roblox?action=game-thumb&placeId=...

const TIMEOUT_MS = 8000;

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── action: lookup (was roblox-lookup.js) ───────────────────────────
async function handleLookup(req, res) {
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

// ── action: game-status (was roblox-game-status.js) ─────────────────
async function handleGameStatus(req, res) {
  // Short cache — player counts change constantly, but we still don't
  // want every homepage visitor triggering a fresh Roblox API round trip.
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const placeId = (req.query.placeId || '').trim();
  if (!placeId || !/^\d+$/.test(placeId)) {
    res.status(400).json({ error: 'Missing or invalid "placeId" query param.' });
    return;
  }

  try {
    const universeData = await fetchJson(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
    const universeId = universeData?.universeId;
    if (!universeId) {
      res.status(404).json({ error: 'Could not resolve this place to a game.' });
      return;
    }

    const gameData = await fetchJson(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
    const game = gameData?.data?.[0];
    if (!game) {
      res.status(404).json({ error: 'No live data for this game.' });
      return;
    }

    res.status(200).json({
      placeId,
      universeId,
      name: game.name,
      playing: game.playing ?? 0,
      visits: game.visits ?? 0,
      maxPlayers: game.maxPlayers ?? null,
    });
  } catch (err) {
    res.status(502).json({ error: 'Roblox lookup failed — try again in a moment.' });
  }
}

// ── action: game-thumb (was roblox-game-thumb.js) ────────────────────
async function handleGameThumb(req, res) {
  // Cache at the edge for an hour — game icons rarely change and this
  // keeps repeat profile-page loads fast without hammering Roblox's API.
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const placeId = (req.query.placeId || '').trim();
  if (!placeId || !/^\d+$/.test(placeId)) {
    res.status(400).json({ error: 'Missing or invalid "placeId" query param.' });
    return;
  }

  try {
    const universeData = await fetchJson(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
    const universeId = universeData?.universeId;
    if (!universeId) {
      res.status(404).json({ error: 'Could not resolve this place to a game.' });
      return;
    }

    const iconData = await fetchJson(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=256x256&format=Png&isCircular=false`
    );
    const thumbnailUrl = iconData?.data?.[0]?.imageUrl || null;

    res.status(200).json({ placeId, universeId, thumbnailUrl });
  } catch (err) {
    res.status(502).json({ error: 'Roblox lookup failed — try again in a moment.' });
  }
}

export default async function handler(req, res) {
  const action = (req.query.action || '').trim();
  switch (action) {
    case 'lookup':
      return handleLookup(req, res);
    case 'game-status':
      return handleGameStatus(req, res);
    case 'game-thumb':
      return handleGameThumb(req, res);
    default:
      res.status(400).json({ error: 'Missing or unknown "action" query param. Expected lookup, game-status, or game-thumb.' });
  }
}
