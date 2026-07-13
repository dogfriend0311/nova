// Shared accolade type definitions used by the Vizta awards admin panel
// and by the player stat page tag display.

export const ACCOLADE_TYPES = [
  { key: 'mvp',            label: 'MVP',            icon: '🏆' },
  { key: 'all_star',       label: 'All-Star',       icon: '⭐' },
  { key: 'gold_glove',     label: 'Gold Glove',     icon: '🧤' },
  { key: 'silver_slugger', label: 'Silver Slugger', icon: '🥈' },
  { key: 'rookie_of_year', label: 'Rookie of the Year', icon: '🌟' },
  { key: 'custom',         label: 'Custom Award…',  icon: '🎖️' },
];

export const accoladeLabel = (a) => {
  const type = ACCOLADE_TYPES.find(t => t.key === a.type);
  const name = a.type === 'custom' ? (a.custom_label || 'Award') : (type ? type.label : (a.custom_label || a.type));
  return a.season ? `${a.season} ${name}` : name;
};

export const accoladeIcon = (a) => {
  const type = ACCOLADE_TYPES.find(t => t.key === a.type);
  return type ? type.icon : '🎖️';
};
