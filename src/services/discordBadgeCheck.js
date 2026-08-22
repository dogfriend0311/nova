/**
 * discordBadgeCheck.js — matches members' self-reported Discord Tag
 * (Member Profile → Discord Tag) against who's actually showing up in the
 * Discord server, and persists a sticky "verified" flag once matched.
 *
 * How matching works:
 *   Discord's public widget (see discordService.js) only lists members who
 *   are currently online — there's no bot/OAuth in this app to check full
 *   membership. So this is inherently best-effort and "eventually
 *   consistent": a member gets the flair the next time anyone's browser
 *   runs this check while they happen to be online in Discord. Once
 *   matched, db.setDiscordVerified() makes it sticky, so it keeps showing
 *   even after they go offline — no bot token or user OAuth needed.
 *
 * Username matching handles both the old "name#1234" discriminator format
 * and the newer discriminator-less usernames, on both sides (widget
 * members are always discriminator-less today, but stored discord_tag
 * values may predate that change).
 */

import discordService from './discordService';
import db from './db';

function normalizeTag(tag) {
  return String(tag || '').trim().split('#')[0].toLowerCase();
}

// Runs once per call — fetches the widget a single time and checks every
// profile passed in, so callers should batch (e.g. the whole member list)
// rather than calling this per-card. Returns the usernames newly matched
// this run, so callers can optimistically update UI state without a reload.
export async function checkAndAwardDiscordBadges(profiles = []) {
  if (!discordService.isConfigured() || !profiles.length) return [];

  const candidates = profiles.filter(p => p.discord_tag && !p.discord_verified_at);
  if (!candidates.length) return [];

  const widget = await discordService.getWidget();
  const onlineNames = new Set((widget?.members || []).map(m => normalizeTag(m.username)));
  if (!onlineNames.size) return [];

  const newlyVerified = [];
  for (const profile of candidates) {
    if (onlineNames.has(normalizeTag(profile.discord_tag))) {
      newlyVerified.push(profile.username);
      db.setDiscordVerified(profile.username).catch(() => {});
    }
  }
  return newlyVerified;
}

export default checkAndAwardDiscordBadges;
