// api/roblox-game-thumb.js
//
// Game thumbnails used to be fetched client-side from
// https://www.roblox.com/Thumbs/GameIcon.ashx — Roblox discontinued that
// endpoint years ago, which is why thumbnails never loaded. The current
// way to get a game's icon is a two-step lookup:
//   1. placeId -> universeId  (apis.roblox.com/universes/v1/places/:id/universe)
//   2. universeId -> icon url (thumbnails.roblox.com/v1/games/icons)
// Both calls happen server-side here to avoid any CORS issues in the browser.

const TIMEOUT_MS = 8000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
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
