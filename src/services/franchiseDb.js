import { supabase } from './supabaseClient';
import * as engine from './franchiseEngine';

const hasSupabase = () => !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);

/** The one shared community league (MVP scope — personal instances come later). */
export async function getSharedInstance() {
  if (!hasSupabase()) return null;
  const { data } = await supabase.from('franchise_instances').select('*').eq('type', 'shared').limit(1).single();
  return data || null;
}

/** Generates the full 32-team league + rosters + a fresh season + schedule.
 *  Call once to bootstrap; safe to no-op if a shared instance already exists. */
export async function initializeSharedLeague() {
  const existing = await getSharedInstance();
  if (existing) return existing;

  const { data: instance, error: instErr } = await supabase
    .from('franchise_instances')
    .insert([{ name: 'Roblox Baseball League', type: 'shared' }])
    .select().single();
  if (instErr) throw new Error(instErr.message);

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

  // Attach rosters to their real inserted team ids
  const allPlayers = [];
  insertedTeams.forEach((team, i) => {
    const rosters = teamsData[i]._rosters;
    ['MLB', 'AAA', 'AA', 'A'].forEach(level => {
      rosters[level].forEach(p => {
        allPlayers.push({ ...p, franchise_instance_id: instance.id, team_id: team.id });
      });
    });
  });
  // Insert in chunks (Supabase/PostgREST has payload limits)
  const CHUNK = 200;
  for (let i = 0; i < allPlayers.length; i += CHUNK) {
    const { error } = await supabase.from('players').insert(allPlayers.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }

  const year = new Date().getFullYear();
  const { data: season, error: seasonErr } = await supabase
    .from('seasons')
    .insert([{ franchise_instance_id: instance.id, year, phase: 'regular', current_day: 1, total_days: 162 }])
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

  return instance;
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

export async function claimTeam(teamId, username) {
  const { error } = await supabase.from('teams').update({ owner_user_id: username }).eq('id', teamId);
  if (error) throw new Error(error.message);
}

/** Simulates every scheduled game for the season's current day, updates
 *  standings + player_game_stats, and advances current_day by one. */
export async function simulateDay(seasonId) {
  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).single();
  if (!season) throw new Error('Season not found');

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

    results.push({ ...game, home_score: sim.homeScore, away_score: sim.awayScore });
  }

  const nextDay = Math.min(season.current_day + 1, season.total_days);
  await supabase.from('seasons').update({ current_day: nextDay }).eq('id', seasonId);

  return results;
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
