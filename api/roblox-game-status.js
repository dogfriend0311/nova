// api/roblox-game-status.js
//
// Live "who's playing right now" data for the homepage Roblox status
// widget. Same two-step lookup pattern as api/roblox-game-thumb.js:
//   1. placeId -> universeId  (apis.roblox.com/universes/v1/places/:id/universe)
//   2. universeId -> live game data (games.roblox.com/v1/games), which
//      includes playing (current player count), visits, and the name.

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
