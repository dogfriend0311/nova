import { PERFECT_ATHLETE_SPORTS, getSportConfig } from '../data/perfectAthleteData';

// Owner/co-owner attribute tweaks live here, separate from the base data
// file, so a dashboard edit never has to touch source code. Shape:
// { [sportKey]: { [playerId]: { [attributeId]: number } } }
const OVERRIDES_KEY = 'nova_perfect_athlete_overrides';

// Builds players save from the "Build the Perfect Athlete" game mode.
const BUILDS_KEY = 'nova_perfect_athlete_builds';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/unavailable — fail silently, same pattern as the rest of the app
  }
}

export function getOverrides() {
  return readJson(OVERRIDES_KEY, {});
}

function clampRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(40, Math.min(99, Math.round(n)));
}

// Returns a sport's full player roster with any owner/co-owner tweaks
// merged on top of the base ratings.
export function getPlayers(sportKey) {
  const sport = getSportConfig(sportKey);
  const overrides = getOverrides()[sport.key] || {};
  return sport.players.map((player) => {
    const playerOverride = overrides[player.id];
    if (!playerOverride) return player;
    return { ...player, ratings: { ...player.ratings, ...playerOverride } };
  });
}

export function listSports() {
  return PERFECT_ATHLETE_SPORTS.map((s) => ({ key: s.key, label: s.label, emoji: s.emoji, unit: s.unit }));
}

// Called from the Owner Dashboard by owners/co-owners to nudge a single
// player's single attribute. Pass value === null (or the original base
// rating) to effectively clear a tweak on save.
export function setPlayerAttribute(sportKey, playerId, attributeId, value) {
  const sport = getSportConfig(sportKey);
  const base = sport.players.find((p) => p.id === playerId);
  if (!base) return getOverrides();

  const clamped = clampRating(value);
  const overrides = getOverrides();
  const sportOverrides = { ...(overrides[sport.key] || {}) };
  const playerOverrides = { ...(sportOverrides[playerId] || {}) };

  const baseValue = base.ratings[attributeId];
  if (clamped === null || clamped === baseValue) {
    delete playerOverrides[attributeId];
  } else {
    playerOverrides[attributeId] = clamped;
  }

  if (Object.keys(playerOverrides).length === 0) {
    delete sportOverrides[playerId];
  } else {
    sportOverrides[playerId] = playerOverrides;
  }

  const next = { ...overrides, [sport.key]: sportOverrides };
  if (Object.keys(sportOverrides).length === 0) delete next[sport.key];
  writeJson(OVERRIDES_KEY, next);
  return next;
}

export function resetPlayer(sportKey, playerId) {
  const overrides = getOverrides();
  const sportOverrides = { ...(overrides[sportKey] || {}) };
  delete sportOverrides[playerId];
  const next = { ...overrides, [sportKey]: sportOverrides };
  if (Object.keys(sportOverrides).length === 0) delete next[sportKey];
  writeJson(OVERRIDES_KEY, next);
  return next;
}

export function resetSport(sportKey) {
  const overrides = getOverrides();
  const next = { ...overrides };
  delete next[sportKey];
  writeJson(OVERRIDES_KEY, next);
  return next;
}

// ── Saved builds ("Hall of Fame" for this game mode) ─────────────────

export function listBuilds(sportKey) {
  const all = readJson(BUILDS_KEY, []);
  return sportKey ? all.filter((b) => b.sportKey === sportKey) : all;
}

export function saveBuild(build) {
  const all = readJson(BUILDS_KEY, []);
  const entry = { ...build, id: build.id || `build-${Date.now()}-${Math.floor(Math.random() * 1000)}`, savedAt: Date.now() };
  const next = [entry, ...all].slice(0, 100);
  writeJson(BUILDS_KEY, next);
  return entry;
}

export function deleteBuild(id) {
  const next = readJson(BUILDS_KEY, []).filter((b) => b.id !== id);
  writeJson(BUILDS_KEY, next);
  return next;
}

const perfectAthleteService = {
  getOverrides,
  getPlayers,
  listSports,
  setPlayerAttribute,
  resetPlayer,
  resetSport,
  listBuilds,
  saveBuild,
  deleteBuild,
};

export default perfectAthleteService;
