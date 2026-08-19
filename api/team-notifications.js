// api/team-notifications.js
//
// Runs on a schedule (see vercel.json's "crons") and checks, for each of
// the 4 real pro sports ESPN covers (MLB/NFL/NBA/NHL): games that just
// went final, and fresh team news — then notifies any member who has
// favorited that team on their profile AND has the matching toggle on
// (Member Profile → Favorite Teams → per-team "Final scores" / "News"
// checkboxes, see MemberProfile.jsx / TeamSelector).
//
// Notifications land in the same nova_notifications table the rest of
// the site already polls (NotificationBell.jsx).
//
// Setup: same CRON_SECRET as api/weekly-digest.js protects this route.

import { Pool } from 'pg';

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

const ESPN_SPORT_PATH = {
  mlb: 'baseball/mlb',
  nfl: 'football/nfl',
  nba: 'basketball/nba',
  nhl: 'hockey/nhl',
};

// Our site's team abbreviations occasionally differ from the ones ESPN's
// API returns for team.abbreviation (see src/data/teams.js LOGO_ABBR,
// which solves the same mismatch for logo URLs) — normalize both sides
// through this table before comparing.
const ABBR_ALIASES = {
  mlb: { TBR: 'TB', CHW: 'CWS', KCR: 'KC', WSN: 'WSH', SDP: 'SD', SFG: 'SF' },
  nba: { GS: 'GSW', NO: 'NOP', SAS: 'SA', UTA: 'UTAH', WAS: 'WSH', NYK: 'NY' },
  nhl: { WSH: 'WSH' },
};
const normalizeAbbr = (sport, abbr) => (ABBR_ALIASES[sport]?.[abbr] || abbr || '').toUpperCase();

async function espnJson(path) {
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}`);
  if (!res.ok) throw new Error(`ESPN ${res.status}: ${path}`);
  return res.json();
}

async function safe(fn, fallback) {
  try { return await fn(); } catch { return fallback; }
}

// Has this exact event already been notified out? Keeps the cron
// idempotent across runs (a final score sticks around for hours; we
// only want to notify once).
async function alreadySent(client, eventKey) {
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS nova_notified_events (event_key TEXT PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now())`
    );
    const { rows } = await client.query(`SELECT 1 FROM nova_notified_events WHERE event_key = $1`, [eventKey]);
    if (rows.length) return true;
    await client.query(`INSERT INTO nova_notified_events (event_key) VALUES ($1) ON CONFLICT DO NOTHING`, [eventKey]);
    return false;
  } catch {
    return false; // if the tracking table itself fails, fail open rather than silently skip everyone
  }
}

async function createNotification(client, username, { type, title, body, link }) {
  await client.query(
    `INSERT INTO nova_notifications (username, type, title, body, link, created_at) VALUES ($1,$2,$3,$4,$5, now())`,
    [username, type, title, body || null, link || null]
  );
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'] || '';
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const client = await getPool().connect();
  let sent = 0;
  try {
    const { rows: profiles } = await client.query(
      `SELECT username, fav_teams, fav_team_notifs FROM nova_member_profiles WHERE fav_teams IS NOT NULL`
    );
    // Only bother members who actually favorited at least one pro team.
    const followers = profiles.filter(p => p.fav_teams && Object.values(p.fav_teams).some(list => Array.isArray(list) && list.length));
    if (!followers.length) {
      res.status(200).json({ skipped: true, reason: 'No members have favorited any teams yet.' });
      return;
    }

    for (const sport of Object.keys(ESPN_SPORT_PATH)) {
      const path = ESPN_SPORT_PATH[sport];

      // ── Final scores ──────────────────────────────────────────
      const scoreboard = await safe(() => espnJson(`${path}/scoreboard`), null);
      const events = scoreboard?.events || [];
      for (const ev of events) {
        const comp = ev.competitions?.[0];
        const statusType = comp?.status?.type?.name || '';
        if (!statusType.includes('FINAL')) continue;
        const competitors = comp?.competitors || [];
        const home = competitors.find(c => c.homeAway === 'home');
        const away = competitors.find(c => c.homeAway === 'away');
        if (!home || !away) continue;
        const homeAbbr = normalizeAbbr(sport, home.team?.abbreviation);
        const awayAbbr = normalizeAbbr(sport, away.team?.abbreviation);
        const scoreLine = `${away.team?.displayName} ${away.score} @ ${home.team?.displayName} ${home.score}`;

        for (const abbr of [homeAbbr, awayAbbr]) {
          const teamName = abbr === homeAbbr ? home.team?.displayName : away.team?.displayName;
          const eventKey = `score:${sport}:${abbr}:${ev.id}`;
          const interested = followers.filter(p => {
            const list = (p.fav_teams?.[sport] || []).map(a => normalizeAbbr(sport, a));
            if (!list.includes(abbr)) return false;
            const teamPrefKey = (p.fav_teams?.[sport] || []).find(a => normalizeAbbr(sport, a) === abbr);
            const notif = p.fav_team_notifs?.[sport]?.[teamPrefKey];
            return notif ? notif.finalScore !== false : true; // default on if no prefs saved yet
          });
          if (!interested.length) continue;
          if (await alreadySent(client, eventKey)) continue;
          for (const p of interested) {
            await createNotification(client, p.username, {
              type: 'score',
              title: `⚡ Final: ${teamName}`,
              body: scoreLine,
              link: `#sports/${sport}`,
            });
            sent++;
          }
        }
      }

      // ── Team news ────────────────────────────────────────────
      const news = await safe(() => espnJson(`${path}/news`), null);
      const articles = news?.articles || [];
      for (const article of articles.slice(0, 15)) {
        const teamAbbrs = (article.categories || [])
          .filter(c => c.type === 'team' && c.teamAbbreviation)
          .map(c => normalizeAbbr(sport, c.teamAbbreviation));
        if (!teamAbbrs.length) continue;
        const eventKey = `news:${sport}:${article.dataSourceIdentifier || article.headline}`;
        for (const abbr of teamAbbrs) {
          const interested = followers.filter(p => {
            const list = (p.fav_teams?.[sport] || []).map(a => normalizeAbbr(sport, a));
            if (!list.includes(abbr)) return false;
            const teamPrefKey = (p.fav_teams?.[sport] || []).find(a => normalizeAbbr(sport, a) === abbr);
            const notif = p.fav_team_notifs?.[sport]?.[teamPrefKey];
            return notif ? notif.news !== false : true;
          });
          if (!interested.length) continue;
          if (await alreadySent(client, eventKey)) continue;
          for (const p of interested) {
            await createNotification(client, p.username, {
              type: 'news',
              title: `📰 ${sport.toUpperCase()} News`,
              body: article.headline,
              link: `#sports/${sport}`,
            });
            sent++;
          }
        }
      }
    }

    res.status(200).json({ sent });
  } catch (err) {
    res.status(502).json({ error: 'Failed to process team notifications.', message: err.message });
  } finally {
    client.release();
  }
}
