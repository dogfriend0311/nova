/* ── storageSync.js ────────────────────────────────────────────────
   Transparent Supabase ↔ localStorage bridge.

   How it works:
   1. On app boot: fetch all shared data from Supabase → localStorage
      (so every device / signed-out visitor sees the same content)
   2. A localStorage.setItem proxy: every write to a synced key is
      automatically pushed to Supabase as well
      (so the owner's edits become visible to everyone immediately)

   No changes needed in any component — they keep reading/writing
   localStorage exactly as before.
───────────────────────────────────────────────────────────────── */
import { supabase } from './supabaseClient';

const SYNC_KEYS = new Set([
  'nabb_teams',
  'nabb_players',
  'nabb_bs_games',
  'nabb_box_scores',
  'nabb_feed',
  'nabb_games',
  'nabb_hof',
  'member_profiles',
  'nova_users',
]);

let _syncEnabled  = false;
let _tableChecked = null;

async function isTableReady() {
  if (_tableChecked !== null) return _tableChecked;
  const { error } = await supabase.from('app_data').select('key').limit(0);
  _tableChecked = !error;
  return _tableChecked;
}

async function pushToSupabase(key, rawValue) {
  if (!(await isTableReady())) return;
  try {
    const parsed = JSON.parse(rawValue);
    await supabase.from('app_data').upsert(
      { key, value: parsed, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } catch {
    // silent — table may not be created yet
  }
}

/* Call once before React renders to intercept all future writes */
export function initStorageSync() {
  const _orig = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    _orig(key, value);
    if (_syncEnabled && SYNC_KEYS.has(key)) {
      pushToSupabase(key, value);
    }
  };
}

/* Call on boot — loads Supabase data into localStorage (read-only pass) */
export async function loadFromSupabase() {
  _syncEnabled = false;

  if (!(await isTableReady())) {
    _syncEnabled = true;
    return;
  }

  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('key, value')
      .in('key', [...SYNC_KEYS]);

    if (error || !data) {
      _syncEnabled = true;
      return;
    }

    for (const row of data) {
      const v = row.value;
      const hasData = Array.isArray(v) ? v.length > 0
                    : (v && typeof v === 'object' && Object.keys(v).length > 0);
      if (hasData) {
        /* Write directly via the original setItem — bypass the proxy */
        const _orig = localStorage.__orig_setItem || localStorage.setItem;
        _orig.call(localStorage, row.key, JSON.stringify(v));
      }
    }
  } catch {
    // network error — fall through to localStorage-only mode
  }

  _syncEnabled = true;
}
