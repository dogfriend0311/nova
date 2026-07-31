// ══════════════════════════════════════════════════════════════
// Diamond League — save slots
// Solo/offline persistence via localStorage, namespaced per Nova
// account (falls back to a shared "guest" bucket when signed out),
// matching the pattern Nova already uses for coins.
// Structure mirrors Hoop Land: 12 slots, each holding one league +
// career/franchise state. Swapping this for Supabase later only
// means changing the functions below — callers don't need to change.
// ══════════════════════════════════════════════════════════════

const SLOT_COUNT = 12;

function keyFor(username) {
  return `nova_diamond_saves_${username || 'guest'}`;
}

function readAll(username) {
  try {
    const raw = localStorage.getItem(keyFor(username));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(username, data) {
  try {
    localStorage.setItem(keyFor(username), JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Diamond League save failed', e);
    return false;
  }
}

export function listSlots(username) {
  const all = readAll(username);
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const slotId = i + 1;
    return all[slotId] ? { slotId, ...all[slotId].meta } : { slotId, empty: true };
  });
}

export function loadSlot(username, slotId) {
  const all = readAll(username);
  return all[slotId] || null;
}

export function saveSlot(username, slotId, state) {
  const all = readAll(username);
  all[slotId] = {
    meta: {
      label: state.meta.label,
      mode: state.meta.mode,
      year: state.meta.year,
      record: state.meta.record,
      icon: state.meta.icon || '⚾',
      updatedAt: Date.now(),
    },
    data: state.data,
  };
  return writeAll(username, all);
}

export function deleteSlot(username, slotId) {
  const all = readAll(username);
  delete all[slotId];
  return writeAll(username, all);
}

export function exportSlotJson(username, slotId) {
  const slot = loadSlot(username, slotId);
  return slot ? JSON.stringify(slot, null, 2) : null;
}

export function importSlotJson(username, slotId, json) {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.data) throw new Error('Missing "data" in save file');
    const all = readAll(username);
    all[slotId] = parsed;
    return writeAll(username, all);
  } catch (e) {
    return { error: e.message };
  }
}

export { SLOT_COUNT };
