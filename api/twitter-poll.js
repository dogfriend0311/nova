// api/twitter-poll.js
//
// NOT USED BY DEFAULT. The live site currently shows tweets via X's
// free official embed widget (src/components/TwitterFeed.jsx) — no
// API key, no cost, nothing to poll. This file is kept around only in
// case you later decide to pay for X API access and want a merged,
// custom-styled feed (built from nova_tweets) instead of X's stock
// per-account embed boxes. It is NOT wired into vercel.json's crons —
// add it back there yourself if you go this route.
//
// Runs on a schedule (see vercel.json's "crons") and checks the X
// (Twitter) API v2 for new tweets from every account the owner has
// added in Owner Dashboard -> Twitter/X Feed (nova_twitter_accounts),
// then caches any new ones into nova_tweets — which a custom feed
// component could read from instead of TwitterFeed.jsx's embeds.
//
// ── READ THIS BEFORE YOU EXPECT TWEETS TO SHOW UP ─────────────────
// 1. X's free API tier can only POST tweets, not read anyone else's
//    timeline. Reading another account's tweets (what this file does)
//    requires a paid X API tier — Basic, at last check around
//    $100-200/mo (X changes pricing without much notice, so check
//    https://developer.x.com/en/products/x-api before you budget for
//    this). There is no free or code-level way around this restriction
//    — it's an account-level permission on X's side.
// 2. Once you have a token, set TWITTER_BEARER_TOKEN as an environment
//    variable in Vercel (Project Settings -> Environment Variables).
// 3. Vercel Cron on the Hobby (free) plan can only run once a day —
//    that will NOT feel like "as soon as they post". Getting tweets in
//    every few minutes needs a Vercel Pro plan (cron as often as once
//    a minute). Set the schedule in vercel.json accordingly.
// 4. Same CRON_SECRET pattern as api/weekly-digest.js protects this
//    route from being triggered by randoms hitting the URL.
//
// This file is written to be correct and ready to go the moment those
// three things (API tier, token, cron plan) are in place — nothing
// else needs to change.

import { Pool } from 'pg';

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

const BEARER = process.env.TWITTER_BEARER_TOKEN;
const API = 'https://api.twitter.com/2';
const MAX_TWEETS_PER_ACCOUNT = 5; // keep well under rate limits — this runs on a schedule, not on demand

async function xFetch(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${BEARER}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.title || json?.detail || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

// Resolves a handle -> numeric X user id + profile info. Cached on the
// account row (twitter_user_id) after the first successful lookup so
// every later poll skips straight to fetching tweets.
async function resolveUser(handle) {
  const json = await xFetch(`/users/by/username/${encodeURIComponent(handle)}?user.fields=profile_image_url,name`);
  if (!json?.data?.id) throw new Error('Account not found on X');
  return json.data; // { id, username, name, profile_image_url }
}

async function fetchRecentTweets(userId) {
  const json = await xFetch(
    `/users/${userId}/tweets?max_results=${MAX_TWEETS_PER_ACCOUNT}&exclude=retweets,replies&tweet.fields=created_at`
  );
  return json?.data || []; // [] when the account just has no recent tweets — not an error
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'] || '';
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!BEARER) {
    res.status(200).json({ ok: false, error: 'TWITTER_BEARER_TOKEN is not set — see comments at the top of this file.' });
    return;
  }

  const pool = getPool();
  const results = [];

  try {
    const { rows: accounts } = await pool.query('SELECT * FROM nova_twitter_accounts');

    for (const account of accounts) {
      try {
        // Resolve + cache the numeric user id on first run for this account.
        let userId = account.twitter_user_id;
        let profile = null;
        if (!userId) {
          profile = await resolveUser(account.handle);
          userId = profile.id;
          await pool.query(
            'UPDATE nova_twitter_accounts SET twitter_user_id = $1 WHERE id = $2',
            [userId, account.id]
          );
        }

        const tweets = await fetchRecentTweets(userId);

        let inserted = 0;
        for (const t of tweets) {
          const { rowCount } = await pool.query(
            `INSERT INTO nova_tweets (tweet_id, handle, author_name, author_avatar, text, tweet_url, posted_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (tweet_id) DO NOTHING`,
            [
              t.id,
              account.handle,
              profile?.name || account.handle,
              profile?.profile_image_url || null,
              t.text,
              `https://twitter.com/${account.handle}/status/${t.id}`,
              t.created_at,
            ]
          );
          inserted += rowCount;
        }

        await pool.query(
          'UPDATE nova_twitter_accounts SET last_synced_at = NOW(), last_error = NULL WHERE id = $1',
          [account.id]
        );
        results.push({ handle: account.handle, ok: true, newTweets: inserted });
      } catch (err) {
        // One bad handle (typo'd, suspended, rate-limited) shouldn't stop
        // the rest of the tracked accounts from syncing.
        await pool.query(
          'UPDATE nova_twitter_accounts SET last_error = $1 WHERE id = $2',
          [err.message || 'Unknown error', account.id]
        );
        results.push({ handle: account.handle, ok: false, error: err.message });
      }
    }

    res.status(200).json({ ok: true, accounts: results.length, results });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message });
  }
}
