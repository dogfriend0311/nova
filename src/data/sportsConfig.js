/**
 * sportsConfig.js — shared stat schema for every Roblox league.
 * Add a new league by adding a new entry here; the league page,
 * owner dashboard admin tabs, and prop bets all read from this file
 * so nothing about a specific sport is hardcoded elsewhere.
 */

// ── Roblox Baseball (existing league, prefix 'vizta') ──────────
const baseball = {
  key: 'vizta',
  label: 'Roblox Baseball',
  shortLabel: 'Baseball',
  propSport: 'baseball',
  icon: '⚾',
  accent: '#5e81f4',
  catA: { id: 'hitting', label: 'Hitting' },
  catB: { id: 'pitching', label: 'Pitching' },

  seasonA: [['season_g','G'],['season_ab','AB'],['season_avg','AVG'],['season_obp','OBP'],['season_slg','SLG'],['season_ops','OPS'],['season_hits','H'],['season_runs','R'],['season_2b','2B'],['season_3b','3B'],['season_home_runs','HR'],['season_rbis','RBI'],['season_bb','BB'],['season_strike_outs','K'],['season_sb','SB']],
  careerA: [['career_g','G'],['career_ab','AB'],['career_avg','AVG'],['career_obp','OBP'],['career_slg','SLG'],['career_ops','OPS'],['hits','H'],['runs','R'],['career_2b','2B'],['career_3b','3B'],['home_runs','HR'],['rbis','RBI'],['career_bb','BB'],['strike_outs','K'],['career_sb','SB']],
  seasonB: [['season_w','W'],['season_l','L'],['season_era','ERA'],['season_pg','G'],['season_gs','GS'],['season_innings_pitched','IP'],['season_strikeouts_pitched','K'],['season_pit_bb','BB'],['season_hits_allowed','H'],['season_earned_runs','ER'],['season_whip','WHIP'],['season_sv','SV'],['season_hld','HLD']],
  careerB: [['career_w','W'],['career_l','L'],['career_era','ERA'],['career_pg','G'],['career_gs','GS'],['innings_pitched','IP'],['strikeouts_pitched','K'],['career_pit_bb','BB'],['hits_allowed','H'],['earned_runs','ER'],['career_whip','WHIP'],['career_sv','SV'],['career_hld','HLD']],

  compareA: [['G','season_g','career_g'],['AB','season_ab','career_ab'],['AVG','season_avg','career_avg'],['OBP','season_obp','career_obp'],['SLG','season_slg','career_slg'],['OPS','season_ops','career_ops'],['H','season_hits','hits'],['R','season_runs','runs'],['2B','season_2b','career_2b'],['3B','season_3b','career_3b'],['HR','season_home_runs','home_runs'],['RBI','season_rbis','rbis'],['BB','season_bb','career_bb'],['K','season_strike_outs','strike_outs'],['SB','season_sb','career_sb']],
  compareB: [['W','season_w','career_w'],['L','season_l','career_l'],['ERA','season_era','career_era'],['G','season_pg','career_pg'],['GS','season_gs','career_gs'],['IP','season_innings_pitched','innings_pitched'],['K','season_strikeouts_pitched','strikeouts_pitched'],['BB','season_pit_bb','career_pit_bb'],['H','season_hits_allowed','hits_allowed'],['ER','season_earned_runs','earned_runs'],['WHIP','season_whip','career_whip'],['SV','season_sv','career_sv'],['HLD','season_hld','career_hld']],
  lowerBetter: ['L','ERA','K','BB','H','ER','WHIP'],

  teamStats: [
    { label:'Team AVG', agg:'avg', field:'season_avg' },
    { label:'Team OBP', agg:'avg', field:'season_obp' },
    { label:'Team SLG', agg:'avg', field:'season_slg' },
    { label:'Team OPS', agg:'avg', field:'season_ops' },
    { label:'Total H',  agg:'sum', field:'season_hits' },
    { label:'Total R',  agg:'sum', field:'season_runs' },
    { label:'Total HR', agg:'sum', field:'season_home_runs' },
    { label:'Total RBI',agg:'sum', field:'season_rbis' },
    { label:'Total SB', agg:'sum', field:'season_sb' },
    { label:'Team ERA', agg:'avg', field:'season_era' },
    { label:'Team WHIP',agg:'avg', field:'season_whip' },
    { label:'Total W',  agg:'sum', field:'season_w' },
    { label:'Total K',  agg:'sum', field:'season_strikeouts_pitched' },
    { label:'Total SV', agg:'sum', field:'season_sv' },
  ],

  leadersA: [
    { label:'Batting Avg', seasonField:'season_avg', careerField:'career_avg', box:null, fmt:'avg3', hi:true },
    { label:'Home Runs',   seasonField:'season_home_runs', careerField:'home_runs', box:'home_runs', fmt:'int', hi:true },
    { label:'RBIs',        seasonField:'season_rbis', careerField:'rbis', box:'rbis', fmt:'int', hi:true },
    { label:'Hits',        seasonField:'season_hits', careerField:'hits', box:'hits', fmt:'int', hi:true },
    { label:'OPS',         seasonField:'season_ops', careerField:'career_ops', box:null, fmt:'avg3', hi:true },
  ],
  leadersB: [
    { label:'ERA',         seasonField:'season_era', careerField:'career_era', box:null, fmt:'avg2', hi:false },
    { label:'Wins',        seasonField:'season_w', careerField:'career_w', box:null, fmt:'int', hi:true },
    { label:'Strikeouts',  seasonField:'season_strikeouts_pitched', careerField:'strikeouts_pitched', box:'strikeouts_pitched', fmt:'int', hi:true },
    { label:'Inn Pitched', seasonField:'season_innings_pitched', careerField:'innings_pitched', box:'innings_pitched', fmt:'avg1', hi:true },
    { label:'Saves',       seasonField:'season_sv', careerField:'career_sv', box:null, fmt:'int', hi:true },
  ],

  boxFields: ['hits','runs','rbis','home_runs','strike_outs','innings_pitched','strikeouts_pitched','hits_allowed','earned_runs'],
  boxLabels: { hits:'H', runs:'R', rbis:'RBI', home_runs:'HR', strike_outs:'K', innings_pitched:'IP', strikeouts_pitched:'KP', hits_allowed:'HA', earned_runs:'ER' },
};

// ── Roblox Hockey League (prefix 'hockey') ──────────────────────
const hockey = {
  key: 'hockey',
  label: 'Roblox Hockey',
  shortLabel: 'Hockey',
  propSport: 'hockey',
  icon: '🏒',
  accent: '#5ee6f4',
  catA: { id: 'skating', label: 'Skating' },
  catB: { id: 'goaltending', label: 'Goaltending' },

  seasonA: [['season_gp','GP'],['season_shots','SOG'],['season_sh_pct','SH%'],['season_ppp','PPP'],['season_gwg','GWG'],['season_pts_pg','P/GP'],['season_goals','G'],['season_assists','A'],['season_pim','PIM'],['season_blocks','BLK'],['season_points','PTS'],['season_plus_minus','+/-'],['season_faceoff_wins','FOW'],['season_giveaways','GV'],['season_takeaways','TK']],
  careerA: [['career_gp','GP'],['career_shots','SOG'],['career_sh_pct','SH%'],['career_ppp','PPP'],['career_gwg','GWG'],['career_pts_pg','P/GP'],['goals','G'],['assists','A'],['career_pim','PIM'],['career_blocks','BLK'],['points','PTS'],['plus_minus','+/-'],['career_faceoff_wins','FOW'],['giveaways','GV'],['career_takeaways','TK']],
  seasonB: [['season_gwins','W'],['season_glosses','L'],['season_gaa','GAA'],['season_ggp','GP'],['season_gs','GS'],['season_minutes','MIN'],['season_saves','SV'],['season_shots_against','SA'],['season_goals_against','GA'],['season_shutouts','SHO'],['season_sv_pct','SV%'],['season_otl','OTL'],['season_assists_g','A']],
  careerB: [['career_gwins','W'],['career_glosses','L'],['career_gaa','GAA'],['career_ggp','GP'],['career_gs','GS'],['minutes','MIN'],['saves','SV'],['career_shots_against','SA'],['goals_against','GA'],['shutouts','SHO'],['career_sv_pct','SV%'],['career_otl','OTL'],['career_assists_g','A']],

  compareA: [['GP','season_gp','career_gp'],['SOG','season_shots','career_shots'],['SH%','season_sh_pct','career_sh_pct'],['PPP','season_ppp','career_ppp'],['GWG','season_gwg','career_gwg'],['P/GP','season_pts_pg','career_pts_pg'],['G','season_goals','goals'],['A','season_assists','assists'],['PIM','season_pim','career_pim'],['BLK','season_blocks','career_blocks'],['PTS','season_points','points'],['+/-','season_plus_minus','plus_minus'],['FOW','season_faceoff_wins','career_faceoff_wins'],['GV','season_giveaways','giveaways'],['TK','season_takeaways','career_takeaways']],
  compareB: [['W','season_gwins','career_gwins'],['L','season_glosses','career_glosses'],['GAA','season_gaa','career_gaa'],['GP','season_ggp','career_ggp'],['GS','season_gs','career_gs'],['MIN','season_minutes','minutes'],['SV','season_saves','saves'],['SA','season_shots_against','career_shots_against'],['GA','season_goals_against','goals_against'],['SHO','season_shutouts','shutouts'],['SV%','season_sv_pct','career_sv_pct'],['OTL','season_otl','career_otl'],['A','season_assists_g','career_assists_g']],
  lowerBetter: ['L','GAA','PIM','GV','GA','OTL'],

  teamStats: [
    { label:'Team SH%', agg:'avg', field:'season_sh_pct' },
    { label:'Team PPP', agg:'avg', field:'season_ppp' },
    { label:'Team GWG', agg:'avg', field:'season_gwg' },
    { label:'Team P/GP',agg:'avg', field:'season_pts_pg' },
    { label:'Total G',  agg:'sum', field:'season_goals' },
    { label:'Total A',  agg:'sum', field:'season_assists' },
    { label:'Total PTS',agg:'sum', field:'season_points' },
    { label:'Total +/-',agg:'sum', field:'season_plus_minus' },
    { label:'Total TK', agg:'sum', field:'season_takeaways' },
    { label:'Team GAA', agg:'avg', field:'season_gaa' },
    { label:'Team SV%', agg:'avg', field:'season_sv_pct' },
    { label:'Total W',  agg:'sum', field:'season_gwins' },
    { label:'Total SV', agg:'sum', field:'season_saves' },
    { label:'Total SHO',agg:'sum', field:'season_shutouts' },
  ],

  leadersA: [
    { label:'Goals',        seasonField:'season_goals', careerField:'goals', box:'goals', fmt:'int', hi:true },
    { label:'Assists',      seasonField:'season_assists', careerField:'assists', box:'assists', fmt:'int', hi:true },
    { label:'Points',       seasonField:'season_points', careerField:'points', box:'points', fmt:'int', hi:true },
    { label:'Plus/Minus',   seasonField:'season_plus_minus', careerField:'plus_minus', box:'plus_minus', fmt:'int', hi:true },
    { label:'Shooting %',   seasonField:'season_sh_pct', careerField:'career_sh_pct', box:null, fmt:'avg3', hi:true },
  ],
  leadersB: [
    { label:'GAA',          seasonField:'season_gaa', careerField:'career_gaa', box:null, fmt:'avg2', hi:false },
    { label:'Wins',         seasonField:'season_gwins', careerField:'career_gwins', box:null, fmt:'int', hi:true },
    { label:'Saves',        seasonField:'season_saves', careerField:'saves', box:'saves', fmt:'int', hi:true },
    { label:'Shutouts',     seasonField:'season_shutouts', careerField:'shutouts', box:'shutouts', fmt:'int', hi:true },
    { label:'Save %',       seasonField:'season_sv_pct', careerField:'career_sv_pct', box:null, fmt:'avg3', hi:true },
  ],

  boxFields: ['goals','assists','plus_minus','points','giveaways','minutes','saves','goals_against','shutouts'],
  boxLabels: { goals:'G', assists:'A', plus_minus:'+/-', points:'PTS', giveaways:'GV', minutes:'MIN', saves:'SV', goals_against:'GA', shutouts:'SHO' },
};

// ── Heavenly Football League — American football (prefix 'football')
const football = {
  key: 'football',
  label: 'Heavenly Football',
  shortLabel: 'Football',
  propSport: 'football',
  icon: '🏈',
  accent: '#ff9e57',
  catA: { id: 'offense', label: 'Offense' },
  catB: { id: 'defense', label: 'Defense' },

  seasonA: [['season_gp','GP'],['season_att','ATT'],['season_ypc','YPC'],['season_ypt','Y/T'],['season_ypg','YPG'],['season_rating','RTG'],['season_rec','REC'],['season_rush_yds','RUY'],['season_rec_yds','RCY'],['season_pass_yds','PSY'],['season_total_td','TD'],['season_pass_td','PTD'],['season_targets','TGT'],['season_fumbles','FUM'],['season_first_downs','1D']],
  careerA: [['career_gp','GP'],['career_att','ATT'],['career_ypc','YPC'],['career_ypt','Y/T'],['career_ypg','YPG'],['career_rating','RTG'],['rec','REC'],['rush_yds','RUY'],['career_rec_yds','RCY'],['career_pass_yds','PSY'],['total_td','TD'],['pass_td','PTD'],['career_targets','TGT'],['fumbles','FUM'],['career_first_downs','1D']],
  seasonB: [['season_solo_tkl','TKL'],['season_ast_tkl','AST'],['season_sacks','SACK'],['season_dgp','GP'],['season_dgs','GS'],['season_tfl','TFL'],['season_def_int','INT'],['season_pd','PD'],['season_ff','FF'],['season_fr','FR'],['season_qb_hits','QBH'],['season_def_td','DTD'],['season_safeties','SFT']],
  careerB: [['career_solo_tkl','TKL'],['career_ast_tkl','AST'],['career_sacks','SACK'],['career_dgp','GP'],['career_dgs','GS'],['tfl','TFL'],['def_int','INT'],['career_pd','PD'],['ff','FF'],['fr','FR'],['career_qb_hits','QBH'],['def_td','DTD'],['career_safeties','SFT']],

  compareA: [['GP','season_gp','career_gp'],['ATT','season_att','career_att'],['YPC','season_ypc','career_ypc'],['Y/T','season_ypt','career_ypt'],['YPG','season_ypg','career_ypg'],['RTG','season_rating','career_rating'],['REC','season_rec','rec'],['RUY','season_rush_yds','rush_yds'],['RCY','season_rec_yds','career_rec_yds'],['PSY','season_pass_yds','career_pass_yds'],['TD','season_total_td','total_td'],['PTD','season_pass_td','pass_td'],['TGT','season_targets','career_targets'],['FUM','season_fumbles','fumbles'],['1D','season_first_downs','career_first_downs']],
  compareB: [['TKL','season_solo_tkl','career_solo_tkl'],['AST','season_ast_tkl','career_ast_tkl'],['SACK','season_sacks','career_sacks'],['GP','season_dgp','career_dgp'],['GS','season_dgs','career_dgs'],['TFL','season_tfl','tfl'],['INT','season_def_int','def_int'],['PD','season_pd','career_pd'],['FF','season_ff','ff'],['FR','season_fr','fr'],['QBH','season_qb_hits','career_qb_hits'],['DTD','season_def_td','def_td'],['SFT','season_safeties','career_safeties']],
  lowerBetter: ['FUM'],

  teamStats: [
    { label:'Team YPC', agg:'avg', field:'season_ypc' },
    { label:'Team YPG', agg:'avg', field:'season_ypg' },
    { label:'Team RTG', agg:'avg', field:'season_rating' },
    { label:'Total REC',agg:'sum', field:'season_rec' },
    { label:'Total RUY',agg:'sum', field:'season_rush_yds' },
    { label:'Total RCY',agg:'sum', field:'season_rec_yds' },
    { label:'Total PSY',agg:'sum', field:'season_pass_yds' },
    { label:'Total TD', agg:'sum', field:'season_total_td' },
    { label:'Total FUM',agg:'sum', field:'season_fumbles' },
    { label:'Total TKL',agg:'sum', field:'season_solo_tkl' },
    { label:'Total SACK',agg:'sum', field:'season_sacks' },
    { label:'Total INT',agg:'sum', field:'season_def_int' },
    { label:'Total FF', agg:'sum', field:'season_ff' },
    { label:'Total DTD',agg:'sum', field:'season_def_td' },
  ],

  leadersA: [
    { label:'Total TDs',    seasonField:'season_total_td', careerField:'total_td', box:'total_td', fmt:'int', hi:true },
    { label:'Rush Yards',   seasonField:'season_rush_yds', careerField:'rush_yds', box:'rush_yds', fmt:'int', hi:true },
    { label:'Pass Yards',   seasonField:'season_pass_yds', careerField:'career_pass_yds', box:null, fmt:'int', hi:true },
    { label:'Receptions',   seasonField:'season_rec', careerField:'rec', box:'rec', fmt:'int', hi:true },
    { label:'Passer Rating',seasonField:'season_rating', careerField:'career_rating', box:null, fmt:'avg1', hi:true },
  ],
  leadersB: [
    { label:'Sacks',        seasonField:'season_sacks', careerField:'career_sacks', box:null, fmt:'avg1', hi:true },
    { label:'Tackles',      seasonField:'season_solo_tkl', careerField:'career_solo_tkl', box:null, fmt:'int', hi:true },
    { label:'Interceptions',seasonField:'season_def_int', careerField:'def_int', box:'def_int', fmt:'int', hi:true },
    { label:'Forced Fumbles',seasonField:'season_ff', careerField:'ff', box:'ff', fmt:'int', hi:true },
    { label:'Def. TDs',     seasonField:'season_def_td', careerField:'def_td', box:null, fmt:'int', hi:true },
  ],

  boxFields: ['rec','rush_yds','pass_td','total_td','fumbles','tfl','def_int','ff','fr'],
  boxLabels: { rec:'REC', rush_yds:'RUY', pass_td:'PTD', total_td:'TD', fumbles:'FUM', tfl:'TFL', def_int:'INT', ff:'FF', fr:'FR' },
};

export const SPORTS = { vizta: baseball, hockey, football };
export const SPORT_ORDER = ['vizta', 'hockey', 'football'];

// ── Owner-added custom stats ──────────────────────────────────
// Populated at runtime (see App.jsx) from the nova_custom_stats table.
// getSport() merges them in automatically, so every existing screen
// that already reads cfg.seasonA/seasonB/careerA/careerB — the admin
// player-edit form and the public player page — picks up new stats
// with no further code changes anywhere else.
const customStatsCache = { vizta: [], hockey: [], football: [] };

export function setCustomStats(league, list) {
  customStatsCache[league] = Array.isArray(list) ? list : [];
}

function withCustomStats(baseCfg, league) {
  const extra = customStatsCache[league];
  if (!extra || extra.length === 0) return baseCfg;
  const cfg = { ...baseCfg };
  ['seasonA', 'seasonB', 'careerA', 'careerB'].forEach((target) => {
    const additions = extra.filter((s) => s.target === target).map((s) => [s.stat_key, s.label]);
    if (additions.length) cfg[target] = [...baseCfg[target], ...additions];
  });
  return cfg;
}

export const getSport = (key) => withCustomStats(SPORTS[key] || SPORTS.vizta, key);

export default SPORTS;
