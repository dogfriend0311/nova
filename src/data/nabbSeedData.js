export const NABB_SEED_TEAMS = [
  { id: 'nabb-cle', team_name: 'CLE', wins: 11, losses: 1 },
  { id: 'nabb-bos', team_name: 'BOS', wins: 6,  losses: 6 },
  { id: 'nabb-ari', team_name: 'ARI', wins: 4,  losses: 8 },
  { id: 'nabb-phi', team_name: 'PHI', wins: 3,  losses: 9 },
];

// Stats sourced from NABB Savant sheet (kennypar_X) — Season 14 data
// Career base stats = multi-season totals used when Career toggle is on
export const NABB_SEED_PLAYERS = [
  {
    id: 'nabb-pigs12341',
    player_name: 'Pigs12341',
    team: 'CLE',
    overall: 82,
    position: 'SP/OF',
    number: '',
    spotify_url: '',
    avatar_data: '',
    // Career totals (S12+S13+S14)
    hits: 49, runs: 30, rbis: 0, home_runs: 14, strike_outs: 0,
    innings_pitched: 37, strikeouts_pitched: 45, hits_allowed: 0, earned_runs: 0,
    // Season 14 advanced overrides from Savant
    adv_era: '7.58', adv_k9: '', adv_h9: '', adv_er9: '',
    adv_h_per_game: '4.00', adv_r_per_game: '2.60',
    adv_rbi_per_game: '', adv_hr_per_game: '0.60', adv_k_per_game: '',
  },
  {
    id: 'nabb-monkxchv',
    player_name: 'Monkxchv',
    team: 'CLE', overall: 75, position: '', number: '', spotify_url: '', avatar_data: '',
    hits: 0, runs: 0, rbis: 0, home_runs: 0, strike_outs: 0,
    innings_pitched: 0, strikeouts_pitched: 0, hits_allowed: 0, earned_runs: 0,
    adv_era: '', adv_k9: '', adv_h9: '', adv_er9: '',
    adv_h_per_game: '', adv_r_per_game: '', adv_rbi_per_game: '', adv_hr_per_game: '', adv_k_per_game: '',
  },
  {
    id: 'nabb-praiseicy',
    player_name: 'praiseicy',
    team: 'BOS', overall: 75, position: '', number: '', spotify_url: '', avatar_data: '',
    hits: 0, runs: 0, rbis: 0, home_runs: 0, strike_outs: 0,
    innings_pitched: 0, strikeouts_pitched: 0, hits_allowed: 0, earned_runs: 0,
    adv_era: '', adv_k9: '', adv_h9: '', adv_er9: '',
    adv_h_per_game: '', adv_r_per_game: '', adv_rbi_per_game: '', adv_hr_per_game: '', adv_k_per_game: '',
  },
  {
    id: 'nabb-kennypar',
    player_name: 'kennypar_X',
    team: 'BOS', overall: 75, position: '', number: '', spotify_url: '', avatar_data: '',
    hits: 0, runs: 0, rbis: 0, home_runs: 0, strike_outs: 0,
    innings_pitched: 0, strikeouts_pitched: 0, hits_allowed: 0, earned_runs: 0,
    adv_era: '', adv_k9: '', adv_h9: '', adv_er9: '',
    adv_h_per_game: '', adv_r_per_game: '', adv_rbi_per_game: '', adv_hr_per_game: '', adv_k_per_game: '',
  },
  {
    id: 'nabb-ericmye',
    player_name: 'ericmye',
    team: 'ARI', overall: 75, position: '', number: '', spotify_url: '', avatar_data: '',
    hits: 0, runs: 0, rbis: 0, home_runs: 0, strike_outs: 0,
    innings_pitched: 0, strikeouts_pitched: 0, hits_allowed: 0, earned_runs: 0,
    adv_era: '', adv_k9: '', adv_h9: '', adv_er9: '',
    adv_h_per_game: '', adv_r_per_game: '', adv_rbi_per_game: '', adv_hr_per_game: '', adv_k_per_game: '',
  },
  {
    id: 'nabb-4kreggom',
    player_name: '4kreggom',
    team: 'PHI', overall: 75, position: '', number: '', spotify_url: '', avatar_data: '',
    hits: 0, runs: 0, rbis: 0, home_runs: 0, strike_outs: 0,
    innings_pitched: 0, strikeouts_pitched: 0, hits_allowed: 0, earned_runs: 0,
    adv_era: '', adv_k9: '', adv_h9: '', adv_er9: '',
    adv_h_per_game: '', adv_r_per_game: '', adv_rbi_per_game: '', adv_hr_per_game: '', adv_k_per_game: '',
  },
];
