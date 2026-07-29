import { supabase } from './supabaseClient';
import * as engine from './franchiseEngine';

const hasSupabase = () => true; // Rivestack via /api/query — no client-side env vars needed

/** The one public shared community league. */
export async function getSharedInstance() {
  if (!hasSupabase()) return null;
  const { data } = await supabase.from('franchise_instances').select('*').eq('type', 'shared').limit(1).single();
  return data || null;
}

/** A user's own private instances (just them + CPU teams). */
export async function getMyPersonalInstances(username) {
  if (!hasSupabase() || !username) return [];
  const { data } = await supabase.from('franchise_instances').select('*').eq('type', 'personal').eq('owner_user_id', username);
  return data || [];
}

/** Shared generator — builds the 32-team league + rosters + a fresh
 *  preseason season + schedule for any instance (shared or personal). */
async function generateLeagueContents(instance) {
  const teamsData = engine.generateLeague();
  const teamRows = teamsData.map(t => ({
    franchise_instance_id: instance.id,
    name: t.name, city: t.city, abbreviation: t.abbreviation,
    league: t.league, division: t.division,
    primary_color: t.primary_color, secondary_color: t.secondary_color,
    budget_cap: t.budget_cap, budget_used: 0, wins: 0, losses: 0,
  }));
  const { data: insertedTeams, error: teamErr } = await supabase.from('teams').insert(teamRows).select();
  if (teamErr) throw new Error(teamErr.message);

  const allPlayers = [];
  insertedTeams.forEach((team, i) => {
    const rosters = teamsData[i]._rosters;
    ['MLB', 'AAA', 'AA', 'A'].forEach(level => {
      rosters[level].forEach(p => {
        allPlayers.push({ ...p, franchise_instance_id: instance.id, team_id: team.id, status: 'active' });
      });
    });
  });
  const CHUNK = 200;
  for (let i = 0; i < allPlayers.length; i += CHUNK) {
    const { error } = await supabase.from('players').insert(allPlayers.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  const year = new Date().getFullYear();
  // Starts in 'preseason' — teams can be claimed/picked before games begin.
  const { data: season, error: seasonErr } = await supabase
    .from('seasons')
    .insert([{ franchise_instance_id: instance.id, year, phase: 'preseason', current_day: 1, total_days: 162 }])
    .select().single();
  if (seasonErr) throw new Error(seasonErr.message);

  const schedule = engine.generateSchedule(insertedTeams.map(t => t.id), 162);
  const gameRows = schedule.map(g => ({
    season_id: season.id, day_number: g.day, home_team_id: g.home, away_team_id: g.away, status: 'scheduled',
  }));
  for (let i = 0; i < gameRows.length; i += CHUNK) {
    const { error } = await supabase.from('games').insert(gameRows.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  return { instance, season };
}

/** Generates the public shared league. Safe to no-op if it already exists. */
export async function initializeSharedLeague() {
  const existing = await getSharedInstance();
  if (existing) return existing;
  const { data: instance, error } = await supabase
    .from('franchise_instances').insert([{ name: 'Nova Baseball Simulator', type: 'shared' }]).select().single();
  if (error) throw new Error(error.message);
  await generateLeagueContents(instance);
  return instance;
}

/** Creates a brand new private instance for one user — just them + 31 CPU teams. */
export async function createPersonalInstance(username, name) {
  const { data: instance, error } = await supabase
    .from('franchise_instances')
    .insert([{ name: name || `${username}'s League`, type: 'personal', owner_user_id: username }])
    .select().single();
  if (error) throw new Error(error.message);
  await generateLeagueContents(instance);
  return instance;
}

/** Deletes a private league and every row that belongs to it — teams,
 *  players, seasons, games, draft picks, trades, stats, free agency
 *  offers. Only the league's own owner may delete it (checked by the
 *  caller passing `username`, verified again here against the row). */
export async function deletePersonalInstance(instanceId, username) {
  const { data: instance } = await supabase.from('franchise_instances').select('*').eq('id', instanceId).single();
  if (!instance) throw new Error('League not found.');
  if (instance.type !== 'personal') throw new Error('Only private leagues can be deleted.');
  if (instance.owner_user_id !== username) throw new Error("You can only delete leagues you created.");

  const { data: teamRows }   = await supabase.from('teams').select('id').eq('franchise_instance_id', instanceId);
  const { data: seasonRows } = await supabase.from('seasons').select('id').eq('franchise_instance_id', instanceId);
  const teamIds   = (teamRows || []).map(t => t.id);
  const seasonIds = (seasonRows || []).map(s => s.id);

  if (seasonIds.length) {
    await supabase.from('player_game_stats').delete().in('season_id', seasonIds);
    await supabase.from('games').delete().in('season_id', seasonIds);
    await supabase.from('draft_picks').delete().in('season_id', seasonIds);
  }
  await supabase.from('trades').delete().eq('franchise_instance_id', instanceId);
  if (teamIds.length) {
    await supabase.from('free_agency_offers').delete().in('team_id', teamIds);
  }
  await supabase.from('players').delete().eq('franchise_instance_id', instanceId);
  await supabase.from('teams').delete().eq('franchise_instance_id', instanceId);
  await supabase.from('seasons').delete().eq('franchise_instance_id', instanceId);

  const { error } = await supabase.from('franchise_instances').delete().eq('id', instanceId);
  if (error) throw new Error(error.message);
}

export async function getTeams(instanceId) {
  const { data } = await supabase.from('teams').select('*').eq('franchise_instance_id', instanceId)
    .order('league').order('division').order('name');
  return data || [];
}

export async function getRoster(teamId, level = 'MLB') {
  const { data } = await supabase.from('players').select('*').eq('team_id', teamId).eq('level', level).order('is_pitcher').order('position');
  return data || [];
}

export async function getCurrentSeason(instanceId) {
  const { data } = await supabase.from('seasons').select('*').eq('franchise_instance_id', instanceId)
    .order('year', { ascending: false }).limit(1).single();
  return data || null;
}

/** Ends the preseason team-selection window and opens regular-season play. */
export async function startSeason(seasonId) {
  const { error } = await supabase.from('seasons').update({ phase: 'regular' }).eq('id', seasonId);
  if (error) throw new Error(error.message);
}

/** Claims a team for a user — blocks claiming a second team in the same league. */
export async function claimTeam(teamId, username, instanceId) {
  const { data: alreadyOwned } = await supabase.from('teams').select('id')
    .eq('franchise_instance_id', instanceId).eq('owner_user_id', username).limit(1);
  if (alreadyOwned && alreadyOwned.length) {
    throw new Error("You already own a team in this league — release it before claiming another.");
  }
  const { error } = await supabase.from('teams').update({ owner_user_id: username }).eq('id', teamId);
  if (error) throw new Error(error.message);
}

// ═══════════════════════════════════════════════════════════════
//  GM ACTIONS — call up / send down / release
// ═══════════════════════════════════════════════════════════════

/** Moves a player between roster levels (call-up or send-down). */
export async function changePlayerLevel(playerId, newLevel) {
  const { error } = await supabase.from('players').update({ level: newLevel }).eq('id', playerId);
  if (error) throw new Error(error.message);
}

/** Releases a player to free agency — off the roster entirely. */
export async function releasePlayer(playerId) {
  const { error } = await supabase.from('players').update({ team_id: null, status: 'free_agent' }).eq('id', playerId);
  if (error) throw new Error(error.message);
}



/** Simulates every scheduled game for the season's current day, updates
 *  standings + player_game_stats, and advances current_day by one. */
export async function simulateDay(seasonId) {
  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).single();
  if (!season) throw new Error('Season not found');
  if (season.phase !== 'regular') throw new Error(`Can't simulate games during "${season.phase}" — finish that phase first.`);

  const { data: dayGames } = await supabase.from('games').select('*')
    .eq('season_id', seasonId).eq('day_number', season.current_day).eq('status', 'scheduled');

  const results = [];
  for (const game of dayGames || []) {
    const [homeRoster, awayRoster] = await Promise.all([
      getRoster(game.home_team_id, 'MLB'),
      getRoster(game.away_team_id, 'MLB'),
    ]);
    if (!homeRoster.length || !awayRoster.length) continue; // safety: skip incomplete rosters

    const sim = engine.simulateGame(homeRoster, awayRoster);

    await supabase.from('games').update({
      status: 'final', home_score: sim.homeScore, away_score: sim.awayScore,
      play_by_play: sim.playByPlay, box_score: sim.boxScore,
    }).eq('id', game.id);

    const statRows = Object.entries(sim.boxScore).map(([playerId, line]) => ({
      game_id: game.id, player_id: playerId, season_id: seasonId,
      ab: line.ab || 0, h: line.h || 0, doubles: line.doubles || 0, triples: line.triples || 0,
      hr: line.hr || 0, bb: line.bb || 0, hbp: line.hbp || 0, so: line.so || 0,
      rbi: line.rbi || 0, runs: line.runs || 0, sb: 0,
      outs_recorded: line.outs_recorded || 0, hits_allowed: line.hits_allowed || 0,
      er: line.er || 0, bb_allowed: line.bb_allowed || 0, k: line.k || 0, hr_allowed: line.hr_allowed || 0,
    }));
    if (statRows.length) await supabase.from('player_game_stats').insert(statRows);

    const homeWon = sim.homeScore > sim.awayScore;
    // Read-modify-write increment (fine for this league size at MVP scale)
    const { data: homeTeam } = await supabase.from('teams').select('wins,losses').eq('id', game.home_team_id).single();
    const { data: awayTeam } = await supabase.from('teams').select('wins,losses').eq('id', game.away_team_id).single();
    if (homeTeam) await supabase.from('teams').update({ wins: homeTeam.wins + (homeWon ? 1 : 0), losses: homeTeam.losses + (homeWon ? 0 : 1) }).eq('id', game.home_team_id);
    if (awayTeam) await supabase.from('teams').update({ wins: awayTeam.wins + (homeWon ? 0 : 1), losses: awayTeam.losses + (homeWon ? 1 : 0) }).eq('id', game.away_team_id);

    results.push({ ...game, home_score: sim.homeScore, away_score: sim.awayScore, play_by_play: sim.playByPlay, box_score: sim.boxScore });
  }

  const nextDay = Math.min(season.current_day + 1, season.total_days);
  await supabase.from('seasons').update({ current_day: nextDay }).eq('id', seasonId);

  return results;
}

/** Fast-forwards through every remaining day of the regular season in one
 *  go. Returns a summary rather than full results (a season is ~161 days
 *  of games — too much to hand back play-by-play for all of it at once). */
export async function simulateRestOfSeason(seasonId, onProgress) {
  let totalGames = 0;
  let daysSimulated = 0;
  for (let i = 0; i < 200; i++) {
    const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).single();
    if (!season || season.phase !== 'regular' || season.current_day > season.total_days) break;
    const dayBefore = season.current_day;
    const dayResults = await simulateDay(seasonId);
    totalGames += dayResults.length;
    daysSimulated++;
    if (onProgress) onProgress(daysSimulated, season.total_days - dayBefore);
    if (dayBefore >= season.total_days) break; // just simulated the final day
  }
  return { daysSimulated, totalGames };
}

/** Aggregates a player's season stats and returns raw counting stats
 *  plus computed advanced stats (OPS, ERA, WHIP, FIP, simplified WAR). */
export async function getPlayerSeasonStats(playerId, seasonId, leagueAverages) {
  const { data: rows } = await supabase.from('player_game_stats').select('*').eq('player_id', playerId).eq('season_id', seasonId);
  const totals = (rows || []).reduce((acc, r) => {
    Object.keys(r).forEach(k => {
      if (typeof r[k] === 'number') acc[k] = (acc[k] || 0) + r[k];
    });
    return acc;
  }, {});

  const avg = engine.battingAvg(totals.h || 0, totals.ab || 0);
  const advanced = {
    avg,
    obp: engine.obp(totals.h || 0, totals.bb || 0, totals.hbp || 0, totals.ab || 0),
    slg: engine.slg(totals.h || 0, totals.doubles || 0, totals.triples || 0, totals.hr || 0, totals.ab || 0),
    ops: engine.ops(totals.h || 0, totals.bb || 0, totals.hbp || 0, totals.doubles || 0, totals.triples || 0, totals.hr || 0, totals.ab || 0),
    era: engine.era(totals.er || 0, totals.outs_recorded || 0),
    whip: engine.whip(totals.bb_allowed || 0, totals.hits_allowed || 0, totals.outs_recorded || 0),
    k9: engine.k9(totals.k || 0, totals.outs_recorded || 0),
    bb9: engine.bb9(totals.bb_allowed || 0, totals.outs_recorded || 0),
    fip: engine.fip(totals.hr_allowed || 0, totals.bb_allowed || 0, totals.k || 0, totals.outs_recorded || 0),
  };
  if (leagueAverages) {
    advanced.war = totals.outs_recorded
      ? engine.simplifiedPitchingWAR(totals, leagueAverages.era)
      : engine.simplifiedBattingWAR(totals, leagueAverages.obp, leagueAverages.slg);
  }
  return { ...totals, ...advanced };
}

/** League-wide averages for the season, used to calibrate simplified WAR. */
export async function getLeagueAverages(seasonId) {
  const { data: rows } = await supabase.from('player_game_stats').select('*').eq('season_id', seasonId);
  if (!rows || !rows.length) return { obp: 0.320, slg: 0.400, era: 4.20 };
  const totals = rows.reduce((acc, r) => {
    ['h','bb','hbp','ab','doubles','triples','hr','er','outs_recorded'].forEach(k => { acc[k] = (acc[k] || 0) + (r[k] || 0); });
    return acc;
  }, {});
  return {
    obp: engine.obp(totals.h, totals.bb, totals.hbp, totals.ab),
    slg: engine.slg(totals.h, totals.doubles, totals.triples, totals.hr, totals.ab),
    era: engine.era(totals.er, totals.outs_recorded),
  };
}

// ═══════════════════════════════════════════════════════════════
//  TRADES
// ═══════════════════════════════════════════════════════════════

export async function proposeTrade(instanceId, proposingTeamId, receivingTeamId, offeredPlayerIds, requestedPlayerIds) {
  const { data, error } = await supabase.from('trades').insert([{
    franchise_instance_id: instanceId,
    proposing_team_id: proposingTeamId,
    receiving_team_id: receivingTeamId,
    players_offered: offeredPlayerIds,
    players_requested: requestedPlayerIds,
    status: 'pending',
  }]).select().single();
  if (error) throw new Error(error.message);

  const { data: receivingTeam } = await supabase.from('teams').select('*').eq('id', receivingTeamId).single();
  if (receivingTeam && !receivingTeam.owner_user_id) {
    return await evaluateAndResolveCpuTrade(data);
  }
  return data;
}

export async function getTradesForTeam(teamId) {
  const { data } = await supabase.from('trades').select('*')
    .or(`proposing_team_id.eq.${teamId},receiving_team_id.eq.${teamId}`)
    .order('created_at', { ascending: false });
  return data || [];
}

async function fetchPlayersByIds(ids) {
  if (!ids || !ids.length) return [];
  const { data } = await supabase.from('players').select('*').in('id', ids);
  return data || [];
}

async function evaluateAndResolveCpuTrade(trade) {
  const [offered, requested] = await Promise.all([
    fetchPlayersByIds(trade.players_offered),
    fetchPlayersByIds(trade.players_requested),
  ]);
  // tradeValue() (not overallRating()) so 4-5★ prospects require a real
  // overpay — a high star rating makes a player harder to pry loose.
  const offeredValue = offered.reduce((s, p) => s + engine.tradeValue(p), 0);
  const requestedValue = requested.reduce((s, p) => s + engine.tradeValue(p), 0);
  const accept = offeredValue >= requestedValue * 0.9;
  return await respondToTrade(trade.id, accept);
}

export async function respondToTrade(tradeId, accept) {
  const { data: trade } = await supabase.from('trades').select('*').eq('id', tradeId).single();
  if (!trade) throw new Error('Trade not found');

  if (accept) {
    if (trade.players_offered?.length) {
      await supabase.from('players').update({ team_id: trade.receiving_team_id }).in('id', trade.players_offered);
    }
    if (trade.players_requested?.length) {
      await supabase.from('players').update({ team_id: trade.proposing_team_id }).in('id', trade.players_requested);
    }
  }
  const { data, error } = await supabase.from('trades')
    .update({ status: accept ? 'accepted' : 'rejected' }).eq('id', tradeId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ═══════════════════════════════════════════════════════════════
//  DRAFT
// ═══════════════════════════════════════════════════════════════

export async function startDraft(instanceId, seasonId, numRounds = 10) {
  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).single();
  const teams = await getTeams(instanceId);
  const order = [...teams].sort((a, b) => (a.wins - a.losses) - (b.wins - b.losses));

  const prospects = [];
  for (let i = 0; i < teams.length * numRounds; i++) prospects.push(engine.generateProspect(season.year));
  const prospectRows = prospects.map(p => ({ ...p, franchise_instance_id: instanceId, team_id: null, status: 'draft_prospect' }));
  const CHUNK = 200;
  const insertedProspects = [];
  for (let i = 0; i < prospectRows.length; i += CHUNK) {
    const { data, error } = await supabase.from('players').insert(prospectRows.slice(i, i + CHUNK)).select();
    if (error) throw new Error(error.message);
    insertedProspects.push(...(data || []));
  }

  const pickRows = [];
  let pickNumber = 1;
  for (let round = 1; round <= numRounds; round++) {
    for (const team of order) {
      pickRows.push({ season_id: seasonId, round, pick_number: pickNumber, team_id: team.id, made: false });
      pickNumber++;
    }
  }
  for (let i = 0; i < pickRows.length; i += CHUNK) {
    const { error } = await supabase.from('draft_picks').insert(pickRows.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  await supabase.from('seasons').update({ phase: 'draft' }).eq('id', seasonId);
  return { prospectCount: insertedProspects.length, pickCount: pickRows.length };
}

export async function getCurrentPick(seasonId) {
  const { data } = await supabase.from('draft_picks').select('*').eq('season_id', seasonId)
    .eq('made', false).order('pick_number', { ascending: true }).limit(1).single();
  return data || null;
}

export async function getAvailableProspects(instanceId) {
  const { data } = await supabase.from('players').select('*')
    .eq('franchise_instance_id', instanceId).eq('status', 'draft_prospect').is('team_id', null);
  return (data || []).sort((a, b) => engine.overallRating(b) - engine.overallRating(a));
}

export async function makeDraftPick(pickId, playerId) {
  const { data: pick } = await supabase.from('draft_picks').select('*').eq('id', pickId).single();
  if (!pick) throw new Error('Pick not found');

  await supabase.from('players').update({
    team_id: pick.team_id, level: 'A', status: 'active',
    draft_round: pick.round, draft_pick: pick.pick_number,
  }).eq('id', playerId);

  const { data, error } = await supabase.from('draft_picks').update({ made: true, player_id: playerId }).eq('id', pickId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function autoAdvanceCpuPicks(instanceId, seasonId) {
  const made = [];
  for (let i = 0; i < 200; i++) {
    const current = await getCurrentPick(seasonId);
    if (!current) break;
    const { data: team } = await supabase.from('teams').select('owner_user_id').eq('id', current.team_id).single();
    if (team?.owner_user_id) break;
    const available = await getAvailableProspects(instanceId);
    if (!available.length) break;
    const best = available[0];
    const result = await makeDraftPick(current.id, best.id);
    made.push(result);
  }
  return made;
}

export async function isDraftComplete(seasonId) {
  const current = await getCurrentPick(seasonId);
  return !current;
}

export async function finishDraft(seasonId) {
  await supabase.from('seasons').update({ phase: 'regular' }).eq('id', seasonId);
}

// ═══════════════════════════════════════════════════════════════
//  FREE AGENCY
// ═══════════════════════════════════════════════════════════════

export async function generateFreeAgentPool(instanceId, count = 40) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({ ...engine.generateFreeAgent(), franchise_instance_id: instanceId, team_id: null, status: 'free_agent' });
  }
  const { data, error } = await supabase.from('players').insert(rows).select();
  if (error) throw new Error(error.message);
  return data;
}

export async function getFreeAgents(instanceId) {
  const { data } = await supabase.from('players').select('*')
    .eq('franchise_instance_id', instanceId).eq('status', 'free_agent').is('team_id', null);
  return (data || []).sort((a, b) => engine.overallRating(b) - engine.overallRating(a));
}

export async function makeFreeAgentOffer(playerId, teamId, offerAmount, years) {
  const [{ data: team }, { data: player }] = await Promise.all([
    supabase.from('teams').select('*').eq('id', teamId).single(),
    supabase.from('players').select('*').eq('id', playerId).single(),
  ]);
  if (!team) throw new Error('Team not found');
  if (!player) throw new Error('Player not found');

  if (team.budget_used + offerAmount > team.budget_cap) {
    throw new Error(`Over budget cap — this team has $${(team.budget_cap - team.budget_used).toLocaleString()} remaining.`);
  }

  const { data: offer, error } = await supabase.from('free_agency_offers').insert([{
    player_id: playerId, team_id: teamId, offer_amount: offerAmount, years, status: 'pending',
  }]).select().single();
  if (error) throw new Error(error.message);

  const marketValue = engine.estimateMarketValue(player);
  const accepted = offerAmount >= marketValue * 0.85;

  if (accepted) {
    await supabase.from('players').update({
      team_id: teamId, status: 'active', salary: offerAmount, contract_years_remaining: years,
    }).eq('id', playerId);
    await supabase.from('teams').update({ budget_used: team.budget_used + offerAmount }).eq('id', teamId);
  }
  await supabase.from('free_agency_offers').update({ status: accepted ? 'accepted' : 'rejected' }).eq('id', offer.id);
  return { accepted, marketValue, offer };
}
