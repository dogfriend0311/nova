// ── Build the Perfect Athlete: base data ─────────────────────────────
// A GoatLab/Pitchergami-style "spin a reel, draft a real pro's rating
// into a slot" game, but multi-sport. Ratings here are Nova's own fan
// power-rankings (60-99 scale, same idea as a sports video game's
// attribute ratings) used purely for this game mode — not a claim of
// official league data.
//
// Owners/co-owners can nudge any of these numbers from the Owner
// Dashboard; perfectAthleteService.js layers those tweaks on top of
// this file without ever mutating it.

export const PERFECT_ATHLETE_SPORTS = [
  {
    key: 'mlb',
    label: 'Baseball',
    emoji: '⚾',
    unit: 'MLB',
    attributes: [
      { id: 'power', label: 'Power' },
      { id: 'contact', label: 'Contact' },
      { id: 'discipline', label: 'Discipline' },
      { id: 'speed', label: 'Speed' },
      { id: 'defense', label: 'Defense' },
      { id: 'clutch', label: 'Clutch' },
    ],
    players: [
      { id: 'mlb-ohtani', name: 'Shohei Ohtani', team: 'Dodgers', ratings: { power: 98, contact: 91, discipline: 89, speed: 90, defense: 72, clutch: 95 } },
      { id: 'mlb-judge', name: 'Aaron Judge', team: 'Yankees', ratings: { power: 99, contact: 88, discipline: 90, speed: 68, defense: 82, clutch: 92 } },
      { id: 'mlb-trout', name: 'Mike Trout', team: 'Angels', ratings: { power: 93, contact: 90, discipline: 94, speed: 85, defense: 85, clutch: 88 } },
      { id: 'mlb-acuna', name: 'Ronald Acuña Jr.', team: 'Braves', ratings: { power: 88, contact: 89, discipline: 82, speed: 98, defense: 84, clutch: 87 } },
      { id: 'mlb-freeman', name: 'Freddie Freeman', team: 'Dodgers', ratings: { power: 87, contact: 94, discipline: 90, speed: 62, defense: 88, clutch: 90 } },
      { id: 'mlb-soto', name: 'Juan Soto', team: 'Mets', ratings: { power: 90, contact: 92, discipline: 99, speed: 70, defense: 74, clutch: 89 } },
      { id: 'mlb-betts', name: 'Mookie Betts', team: 'Dodgers', ratings: { power: 85, contact: 91, discipline: 88, speed: 87, defense: 96, clutch: 91 } },
      { id: 'mlb-altuve', name: 'Jose Altuve', team: 'Astros', ratings: { power: 76, contact: 93, discipline: 84, speed: 84, defense: 80, clutch: 93 } },
      { id: 'mlb-vlad', name: 'Vladimir Guerrero Jr.', team: 'Blue Jays', ratings: { power: 94, contact: 90, discipline: 83, speed: 55, defense: 78, clutch: 86 } },
      { id: 'mlb-carroll', name: 'Corbin Carroll', team: 'Diamondbacks', ratings: { power: 78, contact: 85, discipline: 81, speed: 97, defense: 87, clutch: 82 } },
      { id: 'mlb-witt', name: 'Bobby Witt Jr.', team: 'Royals', ratings: { power: 87, contact: 88, discipline: 78, speed: 96, defense: 90, clutch: 85 } },
      { id: 'mlb-devers', name: 'Rafael Devers', team: 'Giants', ratings: { power: 92, contact: 87, discipline: 85, speed: 58, defense: 70, clutch: 88 } },
    ],
  },
  {
    key: 'nba',
    label: 'Basketball',
    emoji: '🏀',
    unit: 'NBA',
    attributes: [
      { id: 'scoring', label: 'Scoring' },
      { id: 'vision', label: 'Vision' },
      { id: 'defense', label: 'Defense' },
      { id: 'athleticism', label: 'Athleticism' },
      { id: 'discipline', label: 'Shot IQ' },
      { id: 'clutch', label: 'Clutch' },
    ],
    players: [
      { id: 'nba-lebron', name: 'LeBron James', team: 'Lakers', ratings: { scoring: 93, vision: 97, defense: 82, athleticism: 90, discipline: 90, clutch: 95 } },
      { id: 'nba-curry', name: 'Stephen Curry', team: 'Warriors', ratings: { scoring: 96, vision: 90, defense: 68, athleticism: 78, discipline: 93, clutch: 97 } },
      { id: 'nba-jokic', name: 'Nikola Jokić', team: 'Nuggets', ratings: { scoring: 92, vision: 99, defense: 78, athleticism: 68, discipline: 95, clutch: 91 } },
      { id: 'nba-giannis', name: 'Giannis Antetokounmpo', team: 'Bucks', ratings: { scoring: 94, vision: 80, defense: 93, athleticism: 99, discipline: 74, clutch: 89 } },
      { id: 'nba-luka', name: 'Luka Dončić', team: 'Lakers', ratings: { scoring: 96, vision: 95, defense: 68, athleticism: 74, discipline: 86, clutch: 93 } },
      { id: 'nba-durant', name: 'Kevin Durant', team: 'Rockets', ratings: { scoring: 97, vision: 82, defense: 78, athleticism: 82, discipline: 92, clutch: 92 } },
      { id: 'nba-embiid', name: 'Joel Embiid', team: '76ers', ratings: { scoring: 95, vision: 78, defense: 89, athleticism: 85, discipline: 80, clutch: 88 } },
      { id: 'nba-tatum', name: 'Jayson Tatum', team: 'Celtics', ratings: { scoring: 91, vision: 79, defense: 82, athleticism: 84, discipline: 84, clutch: 87 } },
      { id: 'nba-lillard', name: 'Damian Lillard', team: 'Bucks', ratings: { scoring: 92, vision: 88, defense: 66, athleticism: 74, discipline: 87, clutch: 98 } },
      { id: 'nba-davis', name: 'Anthony Davis', team: 'Mavericks', ratings: { scoring: 88, vision: 72, defense: 97, athleticism: 92, discipline: 78, clutch: 85 } },
      { id: 'nba-shai', name: 'Shai Gilgeous-Alexander', team: 'Thunder', ratings: { scoring: 96, vision: 87, defense: 88, athleticism: 84, discipline: 91, clutch: 92 } },
      { id: 'nba-edwards', name: 'Anthony Edwards', team: 'Timberwolves', ratings: { scoring: 91, vision: 76, defense: 80, athleticism: 97, discipline: 72, clutch: 86 } },
    ],
  },
  {
    key: 'nfl',
    label: 'Football',
    emoji: '🏈',
    unit: 'NFL',
    attributes: [
      { id: 'power', label: 'Power' },
      { id: 'speed', label: 'Speed' },
      { id: 'vision', label: 'Vision' },
      { id: 'discipline', label: 'Awareness' },
      { id: 'skill', label: 'Skill' },
      { id: 'clutch', label: 'Clutch' },
    ],
    players: [
      { id: 'nfl-mahomes', name: 'Patrick Mahomes', team: 'Chiefs', ratings: { power: 78, speed: 76, vision: 98, discipline: 90, skill: 97, clutch: 97 } },
      { id: 'nfl-allen', name: 'Josh Allen', team: 'Bills', ratings: { power: 92, speed: 85, vision: 90, discipline: 84, skill: 92, clutch: 93 } },
      { id: 'nfl-jefferson', name: 'Justin Jefferson', team: 'Vikings', ratings: { power: 68, speed: 92, vision: 88, discipline: 85, skill: 97, clutch: 88 } },
      { id: 'nfl-mccaffrey', name: 'Christian McCaffrey', team: '49ers', ratings: { power: 85, speed: 90, vision: 91, discipline: 88, skill: 93, clutch: 87 } },
      { id: 'nfl-parsons', name: 'Micah Parsons', team: 'Packers', ratings: { power: 93, speed: 91, vision: 84, discipline: 82, skill: 92, clutch: 85 } },
      { id: 'nfl-garrett', name: 'Myles Garrett', team: 'Browns', ratings: { power: 97, speed: 87, vision: 78, discipline: 80, skill: 90, clutch: 84 } },
      { id: 'nfl-kelce', name: 'Travis Kelce', team: 'Chiefs', ratings: { power: 80, speed: 78, vision: 90, discipline: 92, skill: 91, clutch: 90 } },
      { id: 'nfl-hill', name: 'Tyreek Hill', team: 'Dolphins', ratings: { power: 62, speed: 99, vision: 85, discipline: 76, skill: 93, clutch: 86 } },
      { id: 'nfl-bosa', name: 'Nick Bosa', team: '49ers', ratings: { power: 95, speed: 84, vision: 80, discipline: 83, skill: 89, clutch: 83 } },
      { id: 'nfl-lamb', name: 'CeeDee Lamb', team: 'Cowboys', ratings: { power: 66, speed: 88, vision: 86, discipline: 84, skill: 94, clutch: 87 } },
      { id: 'nfl-barkley', name: 'Saquon Barkley', team: 'Eagles', ratings: { power: 90, speed: 93, vision: 89, discipline: 82, skill: 90, clutch: 88 } },
      { id: 'nfl-hutchinson', name: 'Aidan Hutchinson', team: 'Lions', ratings: { power: 91, speed: 83, vision: 79, discipline: 85, skill: 87, clutch: 82 } },
    ],
  },
  {
    key: 'nhl',
    label: 'Hockey',
    emoji: '🏒',
    unit: 'NHL',
    attributes: [
      { id: 'power', label: 'Power' },
      { id: 'speed', label: 'Skating' },
      { id: 'vision', label: 'Playmaking' },
      { id: 'discipline', label: 'Discipline' },
      { id: 'defense', label: 'Defense' },
      { id: 'clutch', label: 'Clutch' },
    ],
    players: [
      { id: 'nhl-mcdavid', name: 'Connor McDavid', team: 'Oilers', ratings: { power: 78, speed: 99, vision: 97, discipline: 84, defense: 74, clutch: 94 } },
      { id: 'nhl-mackinnon', name: 'Nathan MacKinnon', team: 'Avalanche', ratings: { power: 86, speed: 96, vision: 92, discipline: 80, defense: 78, clutch: 91 } },
      { id: 'nhl-matthews', name: 'Auston Matthews', team: 'Maple Leafs', ratings: { power: 88, speed: 88, vision: 84, discipline: 82, defense: 76, clutch: 90 } },
      { id: 'nhl-makar', name: 'Cale Makar', team: 'Avalanche', ratings: { power: 80, speed: 95, vision: 93, discipline: 85, defense: 92, clutch: 88 } },
      { id: 'nhl-pastrnak', name: 'David Pastrňák', team: 'Bruins', ratings: { power: 82, speed: 87, vision: 88, discipline: 78, defense: 70, clutch: 89 } },
      { id: 'nhl-draisaitl', name: 'Leon Draisaitl', team: 'Oilers', ratings: { power: 89, speed: 84, vision: 94, discipline: 81, defense: 72, clutch: 90 } },
      { id: 'nhl-kucherov', name: 'Nikita Kucherov', team: 'Lightning', ratings: { power: 76, speed: 86, vision: 98, discipline: 79, defense: 68, clutch: 92 } },
      { id: 'nhl-shesterkin', name: 'Igor Shesterkin', team: 'Rangers', ratings: { power: 70, speed: 72, vision: 85, discipline: 92, defense: 97, clutch: 90 } },
      { id: 'nhl-crosby', name: 'Sidney Crosby', team: 'Penguins', ratings: { power: 85, speed: 85, vision: 93, discipline: 88, defense: 82, clutch: 93 } },
      { id: 'nhl-karlsson', name: 'Erik Karlsson', team: 'Penguins', ratings: { power: 74, speed: 90, vision: 91, discipline: 76, defense: 84, clutch: 84 } },
      { id: 'nhl-hughes', name: 'Quinn Hughes', team: 'Canucks', ratings: { power: 68, speed: 93, vision: 90, discipline: 84, defense: 87, clutch: 85 } },
      { id: 'nhl-eichel', name: 'Jack Eichel', team: 'Golden Knights', ratings: { power: 87, speed: 89, vision: 89, discipline: 80, defense: 75, clutch: 87 } },
    ],
  },
];

export const getSportConfig = (sportKey) =>
  PERFECT_ATHLETE_SPORTS.find((s) => s.key === sportKey) || PERFECT_ATHLETE_SPORTS[0];

export const OVR_TIERS = [
  { min: 99, label: 'GOAT', grade: 'S+', blurb: "Unanimous first-ballot. They'll retire the jersey before the parade ends." },
  { min: 95, label: 'Inner Circle', grade: 'S', blurb: 'A generational talent people will argue about forever — in a good way.' },
  { min: 90, label: 'Superstar', grade: 'A+', blurb: 'Franchise cornerstone. Builds arenas full and banners eventually.' },
  { min: 85, label: 'All-Star', grade: 'A', blurb: 'Perennial All-Star with a case for the Hall every ten years.' },
  { min: 78, label: 'Quality Starter', grade: 'B', blurb: 'Solid every-week starter. Not flashy, always shows up.' },
  { min: 70, label: 'Rotation Piece', grade: 'C', blurb: 'Serviceable pro. Good locker room, good depth chart insurance.' },
  { min: 0, label: 'Camp Body', grade: 'D', blurb: 'Bubble roster spot. Hustle stats only.' },
];

export const getTierForOvr = (ovr) => OVR_TIERS.find((t) => ovr >= t.min) || OVR_TIERS[OVR_TIERS.length - 1];

export default PERFECT_ATHLETE_SPORTS;
