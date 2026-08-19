// api/query.js
//
// This is the ONE backend function that replaces Supabase's auto-generated
// database API. Your frontend code still calls things like
// supabase.from('players').select('*').eq('team_id', 5) — but under the
// hood, that now sends a request here, and this file turns it into a real,
// safe SQL query against Rivestack (plain Postgres).
//
// Security note: this endpoint is reachable by anyone on the internet, the
// same way your Supabase table's public read/write policies were. To keep
// that safe:
//   - Only table names in ALLOWED_TABLES can be queried.
//   - Column names are checked against a strict "looks like a real column
//     name" pattern before ever touching a SQL string.
//   - All actual VALUES (the data itself) are sent as parameterized query
//     arguments ($1, $2, ...), never pasted directly into the SQL string.
//     This is what prevents SQL-injection attacks.

import { Pool } from 'pg';

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

const ALLOWED_TABLES = new Set([
  'franchise_instances', 'teams', 'players', 'seasons', 'games',
  'player_game_stats', 'trades', 'draft_picks', 'free_agency_offers',
  'nova_teams', 'nova_players', 'nova_games', 'nova_bs_games', 'nova_box_scores',
  'nova_game_feed', 'nova_hof', 'nova_watchlist', 'nova_member_profiles',
  'nova_badge_types', 'nova_member_badges', 'nova_articles', 'nova_announcements',
  'nova_radio_config', 'nova_fantasy_schedules', 'nova_users',
  'nova_potm_awards', 'nova_accolades', 'nova_comments',
  'nabb_teams', 'nabb_players', 'nabb_games', 'nabb_box_scores', 'nabb_game_feed',
  'nova_player_comments',
  'fantasy_leagues', 'fantasy_teams', 'fantasy_drafts', 'fantasy_draft_picks', 'fantasy_players',
  'pickems_groups', 'pickems_members', 'pickems_games', 'pickems_picks',
  'app_data',
  'member_profiles', 'admin_users', 'league_teams', 'league_players',
  'player_hitting_stats', 'player_advanced_hitting_stats',
  'player_pitching_stats', 'player_advanced_pitching_stats',
  'members', 'gaming_clips', 'favorite_songs', 'sports_stats', 'scores', 'roblox_stats',
  // Added for: team following, now-playing status, XP/achievements, Roblox badge showcase
  'favorite_teams', 'now_playing', 'member_xp', 'achievements', 'member_achievements', 'roblox_badges',
  // Added for: owner/co-owner-only audit log of dashboard edits
  'nova_audit_log',
  // Added for: owner-defined custom stat columns per league
  'nova_custom_stats',
  // Added for: Roblox live-status widget config + other small owner
  // settings, member reputation/level + daily login streaks, and
  // direct messages between members
  'nova_site_settings', 'nova_user_stats', 'nova_direct_messages',
]);

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertIdent(name, kind) {
  if (typeof name !== 'string' || !IDENT_RE.test(name)) {
    throw new Error(`Invalid ${kind} name: ${JSON.stringify(name)}`);
  }
  return name;
}

// node-postgres has a quirk: a plain JS Array passed as a query parameter
// gets serialized as a Postgres ARRAY LITERAL ("{a,b,c}"), not JSON — even
// when the destination column is jsonb. Plain objects go through
// JSON.stringify correctly, but arrays don't, so any jsonb column that
// holds an array (fav_games, bg_media, audio_tracks, displayed_badges,
// etc. across every table this endpoint serves) would fail on insert with
// "invalid input syntax for type json". Explicitly JSON.stringify arrays
// and objects ourselves so pg just sends plain text and lets Postgres do
// the normal text->jsonb cast.
function toParamValue(v) {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return v;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function quoteIdent(name) {
  return '"' + name.replace(/"/g, '""') + '"';
}

const OP_SQL = {
  eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=',
  like: 'LIKE', ilike: 'ILIKE',
};

function buildWhere(filters, params) {
  if (!filters || filters.length === 0) return '';
  const parts = filters.map((f) => {
    const col = quoteIdent(assertIdent(f.column, 'column'));
    if (f.op === 'in') {
      const arr = Array.isArray(f.value) ? f.value : [f.value];
      const placeholders = arr.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      return `${col} IN (${placeholders.join(',')})`;
    }
    if (f.op === 'is') {
      // supabase uses .is(col, null) for IS NULL checks
      if (f.value === null) return `${col} IS NULL`;
      params.push(f.value);
      return `${col} IS $${params.length}`;
    }
    const sqlOp = OP_SQL[f.op];
    if (!sqlOp) throw new Error(`Unsupported filter operator: ${f.op}`);
    params.push(f.value);
    return `${col} ${sqlOp} $${params.length}`;
  });
  return ' WHERE ' + parts.join(' AND ');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ data: null, error: { message: 'Method not allowed' } });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const {
    table, action, columns, filters = [], order, limit,
    single, maybeSingle, values, onConflict,
  } = body || {};

  try {
    // Temporary diagnostic — call with { table: '__diag__' } to see exactly which
    // database/host this deployed function is connected to, and whether it can
    // see the season_gp column on nova_players. Safe: read-only, no user input.
    if (table === '__diag__') {
      const pool = getPool();
      const info = await pool.query(`
        SELECT current_database() AS database,
               current_schema()   AS schema,
               inet_server_addr()::text AS host,
               (SELECT count(*) FROM information_schema.columns
                 WHERE table_name = 'nova_players' AND column_name = 'season_gp') AS has_season_gp,
               (SELECT count(*) FROM information_schema.columns
                 WHERE table_name = 'nova_players') AS nova_players_column_count,
               (SELECT to_regclass('public.nova_member_profiles')) AS has_nova_member_profiles_table,
               (SELECT to_regclass('public.member_profiles')) AS has_member_profiles_table,
               (SELECT to_regclass('public.nova_audit_log')) AS has_nova_audit_log_table
      `);
      res.status(200).json({ data: info.rows[0], error: null });
      return;
    }

    // Call with { table: '__diag_counts__' } to check how many rows are
    // actually in the member-profile tables after a database migration —
    // e.g. moving from Supabase to Rivestack. Each check is independent
    // so a missing table doesn't break the others.
    if (table === '__diag_counts__') {
      const pool = getPool();
      const safeCount = async (tbl) => {
        try {
          const r = await pool.query(`SELECT count(*)::int AS n FROM ${quoteIdent(tbl)}`);
          return r.rows[0].n;
        } catch (e) {
          return `error: ${e.message}`;
        }
      };
      const [novaMemberProfiles, memberProfiles, novaUsers, novaAuditLog] = await Promise.all([
        safeCount('nova_member_profiles'),
        safeCount('member_profiles'),
        safeCount('nova_users'),
        safeCount('nova_audit_log'),
      ]);
      res.status(200).json({
        data: { nova_member_profiles: novaMemberProfiles, member_profiles: memberProfiles, nova_users: novaUsers, nova_audit_log: novaAuditLog },
        error: null,
      });
      return;
    }

    if (!ALLOWED_TABLES.has(table)) {
      throw new Error(`Table not allowed: ${JSON.stringify(table)}`);
    }
    const tableIdent = quoteIdent(table);
    const pool = getPool();
    const params = [];
    let sql;

    if (action === 'select') {
      const cols = columns && columns !== '*'
        ? columns.split(',').map((c) => quoteIdent(assertIdent(c.trim(), 'column'))).join(',')
        : '*';
      sql = `SELECT ${cols} FROM ${tableIdent}`;
      sql += buildWhere(filters, params);
      if (order && order.column) {
        const col = quoteIdent(assertIdent(order.column, 'column'));
        sql += ` ORDER BY ${col} ${order.ascending === false ? 'DESC' : 'ASC'}`;
      }
      if (limit) sql += ` LIMIT ${Math.max(0, parseInt(limit, 10) || 0)}`;
    } else if (action === 'insert' || action === 'upsert') {
      const rows = Array.isArray(values) ? values : [values];
      if (rows.length === 0) throw new Error('No rows to insert');
      const cols = Object.keys(rows[0]).map((c) => assertIdent(c, 'column'));
      const colList = cols.map(quoteIdent).join(',');
      const valueGroups = rows.map((row) => {
        const placeholders = cols.map((c) => {
          params.push(toParamValue(row[c]));
          return `$${params.length}`;
        });
        return `(${placeholders.join(',')})`;
      });
      sql = `INSERT INTO ${tableIdent} (${colList}) VALUES ${valueGroups.join(',')}`;
      if (action === 'upsert') {
        const conflictCols = (onConflict || '').split(',').map((c) => c.trim()).filter(Boolean).map((c) => quoteIdent(assertIdent(c, 'column')));
        const updateSet = cols
          .filter((c) => !conflictCols.includes(quoteIdent(c)))
          .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
          .join(',');
        sql += ` ON CONFLICT (${conflictCols.join(',')})`;
        sql += updateSet ? ` DO UPDATE SET ${updateSet}` : ' DO NOTHING';
      }
      sql += ' RETURNING *';
    } else if (action === 'update') {
      const cols = Object.keys(values).map((c) => assertIdent(c, 'column'));
      const setParts = cols.map((c) => {
        params.push(toParamValue(values[c]));
        return `${quoteIdent(c)} = $${params.length}`;
      });
      sql = `UPDATE ${tableIdent} SET ${setParts.join(',')}`;
      sql += buildWhere(filters, params);
      sql += ' RETURNING *';
    } else if (action === 'delete') {
      sql = `DELETE FROM ${tableIdent}`;
      sql += buildWhere(filters, params);
      sql += ' RETURNING *';
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }

    const result = await pool.query(sql, params);
    let data = result.rows;

    if (single) {
      if (data.length !== 1) {
        res.status(200).json({ data: null, error: { message: `Expected 1 row, got ${data.length}` } });
        return;
      }
      data = data[0];
    } else if (maybeSingle) {
      data = data.length > 0 ? data[0] : null;
    }

    res.status(200).json({ data, error: null });
  } catch (err) {
    res.status(200).json({
      data: null,
      error: {
        message: err.message,
        code: err.code || null,
        detail: err.detail || null,
        hint: err.hint || null,
      },
    });
  }
}
