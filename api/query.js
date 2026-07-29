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
  'app_data',
  'member_profiles', 'admin_users', 'league_teams', 'league_players',
  'player_hitting_stats', 'player_advanced_hitting_stats',
  'player_pitching_stats', 'player_advanced_pitching_stats',
  'members', 'gaming_clips', 'favorite_songs', 'sports_stats', 'scores', 'roblox_stats',
]);

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertIdent(name, kind) {
  if (typeof name !== 'string' || !IDENT_RE.test(name)) {
    throw new Error(`Invalid ${kind} name: ${JSON.stringify(name)}`);
  }
  return name;
}

function quoteIdent(name) {
  return '"' + name.replace(/"/g, '""') + '"';
}

const OP_SQL = {
  eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=',
  like: 'LIKE', ilike: 'ILIKE',
};

function buildColumns(columns) {
  if (!columns || columns === '*') return '*';
  if (typeof columns === 'string') {
    return columns
      .split(',')
      .map((column) => quoteIdent(assertIdent(column.trim(), 'column')))
      .join(', ');
  }
  if (Array.isArray(columns)) {
    return columns
      .map((column) => quoteIdent(assertIdent(column, 'column')))
      .join(', ');
  }
  throw new Error('Invalid columns specification');
}

function buildWhere(filters, params) {
  if (!filters || filters.length === 0) return '';
  const parts = filters.map((f) => {
    const col = quoteIdent(assertIdent(f.column, 'column'));
    if (f.op === 'in') {
      const arr = Array.isArray(f.value) ? f.value : [f.value];
      if (arr.length === 0) throw new Error('IN filter requires at least one value');
      const placeholders = arr.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      return `${col} IN (${placeholders.join(',')})`;
    }
    if (f.op === 'is') {
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

function buildOrder(order) {
  if (!order || !order.column) return '';
  const column = quoteIdent(assertIdent(order.column, 'column'));
  const direction = order.ascending === false ? 'DESC' : 'ASC';
  return ` ORDER BY ${column} ${direction}`;
}

function buildLimit(limit) {
  if (limit == null) return '';
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error('Invalid limit value');
  return ` LIMIT ${parsed}`;
}

function buildInsert(values, params) {
  const rows = Array.isArray(values) ? values : [values];
  if (rows.length === 0) throw new Error('Insert requires at least one row');
  const keys = Object.keys(rows[0]);
  if (keys.length === 0) throw new Error('Insert row must have at least one column');
  const columns = keys.map((key) => quoteIdent(assertIdent(key, 'column'))).join(', ');
  const placeholders = rows.map((row) => {
    const rowPlaceholders = keys.map((key) => {
      params.push(row[key]);
      return `$${params.length}`;
    });
    return `(${rowPlaceholders.join(', ')})`;
  }).join(', ');
  return { columns, placeholders, keys };
}

function buildUpdate(values, params) {
  const keys = Object.keys(values);
  if (keys.length === 0) throw new Error('Update requires at least one column');
  const setClause = keys.map((key) => {
    const column = quoteIdent(assertIdent(key, 'column'));
    params.push(values[key]);
    return `${column} = $${params.length}`;
  }).join(', ');
  return setClause;
}

function buildOnConflict(onConflict, keys) {
  if (!onConflict) return '';
  const conflictColumns = Array.isArray(onConflict) ? onConflict : [onConflict];
  if (conflictColumns.length === 0) throw new Error('onConflict must specify at least one column');
  const conflictTarget = conflictColumns
    .map((column) => quoteIdent(assertIdent(column, 'column')))
    .join(', ');
  if (keys.length === 0) return ` ON CONFLICT (${conflictTarget}) DO NOTHING`;
  const updates = keys
    .map((key) => {
      const column = quoteIdent(assertIdent(key, 'column'));
      return `${column} = EXCLUDED.${column}`;
    })
    .join(', ');
  return ` ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates}`;
}

function buildReturning(action) {
  if (action === 'insert' || action === 'upsert' || action === 'update' || action === 'delete') {
    return ' RETURNING *';
  }
  return '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ data: null, error: { message: 'Method not allowed' } });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const {
    table, action = 'select', columns, filters = [], order, limit,
    single, maybeSingle, values, onConflict,
  } = body || {};

  try {
    if (!ALLOWED_TABLES.has(table)) {
      throw new Error(`Table not allowed: ${JSON.stringify(table)}`);
    }

    const tableIdent = quoteIdent(table);
    const pool = getPool();
    const params = [];
    let sql;

    if (action === 'select') {
      const cols = buildColumns(columns || '*');
      sql = `SELECT ${cols} FROM ${tableIdent}`;
      sql += buildWhere(filters, params);
      sql += buildOrder(order);
      sql += buildLimit(limit);
    } else if (action === 'insert') {
      const { columns: cols, placeholders, keys } = buildInsert(values, params);
      sql = `INSERT INTO ${tableIdent} (${cols}) VALUES ${placeholders}`;
      sql += buildOnConflict(onConflict, keys);
      sql += buildReturning('insert');
    } else if (action === 'upsert') {
      const { columns: cols, placeholders, keys } = buildInsert(values, params);
      sql = `INSERT INTO ${tableIdent} (${cols}) VALUES ${placeholders}`;
      sql += buildOnConflict(onConflict, keys);
      sql += buildReturning('upsert');
    } else if (action === 'update') {
      if (!values || typeof values !== 'object') {
        throw new Error('Update requires values object');
      }
      const setClause = buildUpdate(values, params);
      sql = `UPDATE ${tableIdent} SET ${setClause}`;
      sql += buildWhere(filters, params);
      sql += buildReturning('update');
    } else if (action === 'delete') {
      sql = `DELETE FROM ${tableIdent}`;
      sql += buildWhere(filters, params);
      sql += buildReturning('delete');
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }

    const result = await pool.query(sql, params);

    let data = result.rows;
    if (action === 'select') {
      if (single) {
        if (data.length === 0) {
          throw new Error('No rows returned for single()');
        }
        data = data[0];
      } else if (maybeSingle) {
        data = data.length > 0 ? data[0] : null;
      }
    }

    res.status(200).json({ data, error: null });
  } catch (err) {
    res.status(200).json({ data: null, error: { message: err.message } });
  }
}
