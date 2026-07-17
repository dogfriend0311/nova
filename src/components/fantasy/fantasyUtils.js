// Shared helpers for the Fantasy Sports UI — sport metadata, default
// roster/scoring settings, and small formatting helpers used across panels.

export const SPORTS = [
  { id: 'nfl', label: 'NFL', icon: '🏈' },
  { id: 'nba', label: 'NBA', icon: '🏀' },
  { id: 'mlb', label: 'MLB', icon: '⚾' },
  { id: 'nhl', label: 'NHL', icon: '🏒' },
];

export const DEFAULT_ROSTER_SETTINGS = {
  nfl: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6 },
  nba: { PG: 1, SG: 1, SF: 1, PF: 1, C: 1, G: 1, F: 1, UTIL: 1, BENCH: 4 },
  mlb: { C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 1, SP: 2, RP: 2, BENCH: 5 },
  nhl: { C: 2, LW: 1, RW: 1, D: 2, UTIL: 1, G: 2, BENCH: 5 },
};

export const rosterSlotList = (sport) => {
  const s = DEFAULT_ROSTER_SETTINGS[sport] || {};
  const slots = [];
  Object.entries(s).forEach(([slot, count]) => {
    if (slot === 'BENCH') return;
    for (let i = 0; i < count; i++) slots.push(slot);
  });
  const benchCount = s.BENCH || 5;
  for (let i = 0; i < benchCount; i++) slots.push('BENCH');
  return slots;
};

export const sportLabel = (id) => SPORTS.find(s => s.id === id)?.label || id?.toUpperCase();
export const sportIcon = (id) => SPORTS.find(s => s.id === id)?.icon || '🏆';

export const formatRecord = (team) => `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`;

export const todayYYYYMMDD = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};
