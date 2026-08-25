// Shared accolade type definitions used by the Roblox league awards admin panel
// and by the player stat page tag display.

const UNIVERSAL = [
  { key: 'mvp',            label: 'MVP',                icon: '🏆' },
  { key: 'all_star',       label: 'All-Star',           icon: '⭐' },
  { key: 'rookie_of_year', label: 'Rookie of the Year', icon: '🌟' },
];

const BASEBALL_ONLY = [
  { key: 'gold_glove',     label: 'Gold Glove',         icon: '🧤' },
  { key: 'silver_slugger', label: 'Silver Slugger',     icon: '🥈' },
];

const HOCKEY_ONLY = [
  { key: 'vezina',         label: 'Vezina (Best Goalie)',    icon: '🥅' },
  { key: 'norris',         label: 'Norris (Best Defenseman)', icon: '🛡️' },
];

const FOOTBALL_ONLY = [
  { key: 'opoy',           label: 'Offensive Player of the Year', icon: '🏈' },
  { key: 'dpoy',           label: 'Defensive Player of the Year', icon: '🛡️' },
];

const CUSTOM = [
  { key: 'custom',         label: 'Custom Award…',      icon: '🎖️' },
];

// ── Commissioner-defined award categories ───────────────────────
// Populated at runtime (see App.jsx) from the nova_custom_award_types
// table, the same way owner-added custom stats are merged into
// sportsConfig.js. These are real, reusable, named categories (with
// their own icon) that a commissioner has created for a specific
// league — distinct from the generic one-off "Custom Award…" free-text
// entry, which always stays available as the last option.
const customAwardTypesCache = { vizta: [], hockey: [], football: [] };

export function setCustomAwardTypes(league, list) {
  customAwardTypesCache[league] = Array.isArray(list)
    ? list.map((t) => ({ key: t.key, label: t.label, icon: t.icon || '🎖️' }))
    : [];
}

export const ACCOLADE_TYPES_BY_SPORT = {
  vizta:    [...UNIVERSAL, ...BASEBALL_ONLY],
  hockey:   [...UNIVERSAL, ...HOCKEY_ONLY],
  football: [...UNIVERSAL, ...FOOTBALL_ONLY],
};

export const getAccoladeTypes = (sportKey) => {
  const base = ACCOLADE_TYPES_BY_SPORT[sportKey] || ACCOLADE_TYPES_BY_SPORT.vizta;
  return [...base, ...(customAwardTypesCache[sportKey] || []), ...CUSTOM];
};

// Backward-compatible flat list (baseball) for any code that hasn't been
// updated to pass a sport key yet.
export const ACCOLADE_TYPES = [...ACCOLADE_TYPES_BY_SPORT.vizta, ...CUSTOM];

export const accoladeLabel = (a) => {
  const allCustom = Object.values(customAwardTypesCache).flat();
  const all = [...UNIVERSAL, ...BASEBALL_ONLY, ...HOCKEY_ONLY, ...FOOTBALL_ONLY, ...allCustom, ...CUSTOM];
  const type = all.find(t => t.key === a.type);
  const name = a.type === 'custom' ? (a.custom_label || 'Award') : (type ? type.label : (a.custom_label || a.type));
  return a.season ? `${a.season} ${name}` : name;
};

export const accoladeIcon = (a) => {
  const allCustom = Object.values(customAwardTypesCache).flat();
  const all = [...UNIVERSAL, ...BASEBALL_ONLY, ...HOCKEY_ONLY, ...FOOTBALL_ONLY, ...allCustom, ...CUSTOM];
  const type = all.find(t => t.key === a.type);
  return type ? type.icon : '🎖️';
};
