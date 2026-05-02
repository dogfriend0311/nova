/* ── ESPN CDN Logo Helper ───────────────────────────────────────
   Maps our abbreviations → ESPN CDN abbreviations where they differ
   URL format: https://a.espncdn.com/i/teamlogos/{sport}/500/scoreboard/{abbr}.png
   ─────────────────────────────────────────────────────────────── */
const LOGO_ABBR = {
  mlb: { TBR:'tb', CHW:'cws', KCR:'kc', WSN:'wsh', SDP:'sd', SFG:'sf' },
  nfl: { WAS:'wsh', KC:'kc', LV:'lv', NE:'ne', SF:'sf', TB:'tb', GB:'gb', NO:'no', LAR:'lar', LAC:'lac', NYG:'nyg', NYJ:'nyj', DAL:'dal', PHI:'phi', CHI:'chi', DET:'det', MIN:'min', ATL:'atl', CAR:'car' },
  nba: { GS:'gs', NO:'no', SAS:'sa', UTA:'utah', WAS:'wsh', BKN:'bkn', NYK:'nyk', OKC:'okc', PHX:'phx', SAC:'sac', LAC:'lac', LAL:'lal', MEM:'mem', POR:'por', DEN:'den', MIL:'mil', IND:'ind', ORL:'orl', CHA:'cha' },
  nhl: { WSH:'wsh', TBL:'tbl', NJD:'njd', NYI:'nyi', NYR:'nyr', VGK:'vgk', UTA:'utah', CGY:'cgy', EDM:'edm', MTL:'mtl', OTT:'ott', CBJ:'cbj', WPG:'wpg', NSH:'nsh', SJS:'sjs', VAN:'van', FLA:'fla', BUF:'buf', ANA:'ana' },
};

export const getTeamLogoUrl = (sport, abbr) => {
  const sportPath = { mlb:'mlb', nfl:'nfl', nba:'nba', nhl:'nhl' }[sport];
  if (!sportPath) return null;
  const a = (LOGO_ABBR[sport]?.[abbr] ?? abbr).toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/${sportPath}/500/scoreboard/${a}.png`;
};

export const getTeamByAbbr = (sport, abbr) => {
  const divs = TEAMS[sport] || {};
  for (const teams of Object.values(divs)) {
    const found = teams.find((t) => t.abbr === abbr);
    if (found) return found;
  }
  return { abbr, name: abbr };
};

/* ── Sport metadata ─────────────────────────────────────────── */
export const SPORT_LABELS = {
  mlb: '⚾ MLB',
  nfl: '🏈 NFL',
  nba: '🏀 NBA',
  nhl: '🏒 NHL',
  cfb: '🏈 College Football',
  cbb: '⚾ College Baseball',
};

export const SPORT_ICONS = {
  mlb: '⚾', nfl: '🏈', nba: '🏀', nhl: '🏒', cfb: '🏈', cbb: '⚾',
};

export const SPORT_SHORT = {
  mlb: 'MLB', nfl: 'NFL', nba: 'NBA', nhl: 'NHL', cfb: 'Col. Football', cbb: 'Col. Baseball',
};

/* ── Team Rosters ────────────────────────────────────────────── */
export const TEAMS = {
  mlb: {
    'AL East':    [{ abbr:'BAL',name:'Orioles' },{ abbr:'BOS',name:'Red Sox' },{ abbr:'NYY',name:'Yankees' },{ abbr:'TBR',name:'Rays' },{ abbr:'TOR',name:'Blue Jays' }],
    'AL Central': [{ abbr:'CHW',name:'White Sox' },{ abbr:'CLE',name:'Guardians' },{ abbr:'DET',name:'Tigers' },{ abbr:'KCR',name:'Royals' },{ abbr:'MIN',name:'Twins' }],
    'AL West':    [{ abbr:'HOU',name:'Astros' },{ abbr:'LAA',name:'Angels' },{ abbr:'OAK',name:'Athletics' },{ abbr:'SEA',name:'Mariners' },{ abbr:'TEX',name:'Rangers' }],
    'NL East':    [{ abbr:'ATL',name:'Braves' },{ abbr:'MIA',name:'Marlins' },{ abbr:'NYM',name:'Mets' },{ abbr:'PHI',name:'Phillies' },{ abbr:'WSN',name:'Nationals' }],
    'NL Central': [{ abbr:'CHC',name:'Cubs' },{ abbr:'CIN',name:'Reds' },{ abbr:'MIL',name:'Brewers' },{ abbr:'PIT',name:'Pirates' },{ abbr:'STL',name:'Cardinals' }],
    'NL West':    [{ abbr:'ARI',name:'D-backs' },{ abbr:'COL',name:'Rockies' },{ abbr:'LAD',name:'Dodgers' },{ abbr:'SDP',name:'Padres' },{ abbr:'SFG',name:'Giants' }],
  },
  nfl: {
    'AFC East':   [{ abbr:'BUF',name:'Bills' },{ abbr:'MIA',name:'Dolphins' },{ abbr:'NE',name:'Patriots' },{ abbr:'NYJ',name:'Jets' }],
    'AFC North':  [{ abbr:'BAL',name:'Ravens' },{ abbr:'CIN',name:'Bengals' },{ abbr:'CLE',name:'Browns' },{ abbr:'PIT',name:'Steelers' }],
    'AFC South':  [{ abbr:'HOU',name:'Texans' },{ abbr:'IND',name:'Colts' },{ abbr:'JAX',name:'Jaguars' },{ abbr:'TEN',name:'Titans' }],
    'AFC West':   [{ abbr:'DEN',name:'Broncos' },{ abbr:'KC',name:'Chiefs' },{ abbr:'LV',name:'Raiders' },{ abbr:'LAC',name:'Chargers' }],
    'NFC East':   [{ abbr:'DAL',name:'Cowboys' },{ abbr:'NYG',name:'Giants' },{ abbr:'PHI',name:'Eagles' },{ abbr:'WAS',name:'Commanders' }],
    'NFC North':  [{ abbr:'CHI',name:'Bears' },{ abbr:'DET',name:'Lions' },{ abbr:'GB',name:'Packers' },{ abbr:'MIN',name:'Vikings' }],
    'NFC South':  [{ abbr:'ATL',name:'Falcons' },{ abbr:'CAR',name:'Panthers' },{ abbr:'NO',name:'Saints' },{ abbr:'TB',name:'Buccaneers' }],
    'NFC West':   [{ abbr:'ARI',name:'Cardinals' },{ abbr:'LAR',name:'Rams' },{ abbr:'SF',name:'49ers' },{ abbr:'SEA',name:'Seahawks' }],
  },
  nba: {
    'Atlantic':   [{ abbr:'BOS',name:'Celtics' },{ abbr:'BKN',name:'Nets' },{ abbr:'NYK',name:'Knicks' },{ abbr:'PHI',name:'76ers' },{ abbr:'TOR',name:'Raptors' }],
    'Central':    [{ abbr:'CHI',name:'Bulls' },{ abbr:'CLE',name:'Cavaliers' },{ abbr:'DET',name:'Pistons' },{ abbr:'IND',name:'Pacers' },{ abbr:'MIL',name:'Bucks' }],
    'Southeast':  [{ abbr:'ATL',name:'Hawks' },{ abbr:'CHA',name:'Hornets' },{ abbr:'MIA',name:'Heat' },{ abbr:'ORL',name:'Magic' },{ abbr:'WAS',name:'Wizards' }],
    'Northwest':  [{ abbr:'DEN',name:'Nuggets' },{ abbr:'MIN',name:'T-Wolves' },{ abbr:'OKC',name:'Thunder' },{ abbr:'POR',name:'Trail Blazers' },{ abbr:'UTA',name:'Jazz' }],
    'Pacific':    [{ abbr:'GS',name:'Warriors' },{ abbr:'LAC',name:'Clippers' },{ abbr:'LAL',name:'Lakers' },{ abbr:'PHX',name:'Suns' },{ abbr:'SAC',name:'Kings' }],
    'Southwest':  [{ abbr:'DAL',name:'Mavericks' },{ abbr:'HOU',name:'Rockets' },{ abbr:'MEM',name:'Grizzlies' },{ abbr:'NO',name:'Pelicans' },{ abbr:'SAS',name:'Spurs' }],
  },
  nhl: {
    'Atlantic':     [{ abbr:'BOS',name:'Bruins' },{ abbr:'BUF',name:'Sabres' },{ abbr:'DET',name:'Red Wings' },{ abbr:'FLA',name:'Panthers' },{ abbr:'MTL',name:'Canadiens' },{ abbr:'OTT',name:'Senators' },{ abbr:'TBL',name:'Lightning' },{ abbr:'TOR',name:'Maple Leafs' }],
    'Metropolitan': [{ abbr:'CAR',name:'Hurricanes' },{ abbr:'CBJ',name:'Blue Jackets' },{ abbr:'NJD',name:'Devils' },{ abbr:'NYI',name:'Islanders' },{ abbr:'NYR',name:'Rangers' },{ abbr:'PHI',name:'Flyers' },{ abbr:'PIT',name:'Penguins' },{ abbr:'WSH',name:'Capitals' }],
    'Central':      [{ abbr:'CHI',name:'Blackhawks' },{ abbr:'COL',name:'Avalanche' },{ abbr:'DAL',name:'Stars' },{ abbr:'MIN',name:'Wild' },{ abbr:'NSH',name:'Predators' },{ abbr:'STL',name:'Blues' },{ abbr:'UTA',name:'Hockey Club' },{ abbr:'WPG',name:'Jets' }],
    'Pacific':      [{ abbr:'ANA',name:'Ducks' },{ abbr:'CGY',name:'Flames' },{ abbr:'EDM',name:'Oilers' },{ abbr:'LA',name:'Kings' },{ abbr:'SJS',name:'Sharks' },{ abbr:'SEA',name:'Kraken' },{ abbr:'VAN',name:'Canucks' },{ abbr:'VGK',name:'Golden Knights' }],
  },
  cfb: {
    'SEC':      [{ abbr:'ALA',name:'Alabama' },{ abbr:'UGA',name:'Georgia' },{ abbr:'LSU',name:'LSU' },{ abbr:'FLA',name:'Florida' },{ abbr:'TENN',name:'Tennessee' },{ abbr:'TAMU',name:'Texas A&M' },{ abbr:'AUB',name:'Auburn' },{ abbr:'ARK',name:'Arkansas' },{ abbr:'OLE',name:'Ole Miss' },{ abbr:'MSU',name:'Miss. State' },{ abbr:'VANDY',name:'Vanderbilt' },{ abbr:'SC',name:'S. Carolina' },{ abbr:'UK',name:'Kentucky' },{ abbr:'MIZ',name:'Missouri' },{ abbr:'TEX',name:'Texas' },{ abbr:'OU',name:'Oklahoma' }],
    'Big Ten':  [{ abbr:'MICH',name:'Michigan' },{ abbr:'OSU',name:'Ohio State' },{ abbr:'PSU',name:'Penn State' },{ abbr:'WISC',name:'Wisconsin' },{ abbr:'IOWA',name:'Iowa' },{ abbr:'MIN',name:'Minnesota' },{ abbr:'NEB',name:'Nebraska' },{ abbr:'PUR',name:'Purdue' },{ abbr:'ORE',name:'Oregon' },{ abbr:'USC',name:'USC' },{ abbr:'UCLA',name:'UCLA' },{ abbr:'WASH',name:'Washington' }],
    'ACC':      [{ abbr:'CLEM',name:'Clemson' },{ abbr:'FSU',name:'Florida State' },{ abbr:'MIA',name:'Miami' },{ abbr:'UNC',name:'N. Carolina' },{ abbr:'NCST',name:'NC State' },{ abbr:'VT',name:'Virginia Tech' },{ abbr:'WAKE',name:'Wake Forest' },{ abbr:'DUKE',name:'Duke' },{ abbr:'PITT',name:'Pittsburgh' },{ abbr:'LOU',name:'Louisville' }],
    'Big 12':   [{ abbr:'KSU',name:'Kansas State' },{ abbr:'OKST',name:'Oklahoma St.' },{ abbr:'TCU',name:'TCU' },{ abbr:'BAY',name:'Baylor' },{ abbr:'ISU',name:'Iowa State' },{ abbr:'WVU',name:'West Virginia' },{ abbr:'TTU',name:'Texas Tech' },{ abbr:'BYU',name:'BYU' },{ abbr:'CIN',name:'Cincinnati' },{ abbr:'UCF',name:'UCF' }],
    'Other':    [{ abbr:'ND',name:'Notre Dame' },{ abbr:'BSU',name:'Boise State' },{ abbr:'APS',name:'App State' }],
  },
  cbb: {
    'SEC':      [{ abbr:'VANDY',name:'Vanderbilt' },{ abbr:'LSU',name:'LSU' },{ abbr:'FLA',name:'Florida' },{ abbr:'ARK',name:'Arkansas' },{ abbr:'TENN',name:'Tennessee' },{ abbr:'OLE',name:'Ole Miss' },{ abbr:'MSU',name:'Miss. State' },{ abbr:'TAMU',name:'Texas A&M' },{ abbr:'UK',name:'Kentucky' },{ abbr:'UGA',name:'Georgia' },{ abbr:'SC',name:'S. Carolina' },{ abbr:'AUB',name:'Auburn' },{ abbr:'ALA',name:'Alabama' }],
    'ACC':      [{ abbr:'FSU',name:'Florida State' },{ abbr:'CLEM',name:'Clemson' },{ abbr:'UVA',name:'Virginia' },{ abbr:'GT',name:'Georgia Tech' },{ abbr:'WAKE',name:'Wake Forest' },{ abbr:'NCST',name:'NC State' },{ abbr:'MIA',name:'Miami' },{ abbr:'UNC',name:'N. Carolina' },{ abbr:'LOU',name:'Louisville' }],
    'Big 12':   [{ abbr:'TCU',name:'TCU' },{ abbr:'TEX',name:'Texas' },{ abbr:'OKST',name:'Oklahoma St.' },{ abbr:'WVU',name:'West Virginia' },{ abbr:'KSU',name:'Kansas State' },{ abbr:'BAY',name:'Baylor' },{ abbr:'TTU',name:'Texas Tech' }],
    'Pac-12':   [{ abbr:'OSU',name:'Oregon State' },{ abbr:'STAN',name:'Stanford' },{ abbr:'ARI',name:'Arizona' },{ abbr:'UCLA',name:'UCLA' }],
    'Big Ten':  [{ abbr:'IND',name:'Indiana' },{ abbr:'MICH',name:'Michigan' },{ abbr:'MD',name:'Maryland' },{ abbr:'NEB',name:'Nebraska' },{ abbr:'OSU',name:'Ohio State' }],
    'Other':    [{ abbr:'ND',name:'Notre Dame' },{ abbr:'CHAR',name:'Charlotte' },{ abbr:'ECU',name:'East Carolina' }],
  },
};

export const ALL_TEAMS_FLAT = Object.fromEntries(
  Object.entries(TEAMS).map(([sport, divs]) => [
    sport,
    Object.values(divs).flat(),
  ])
);
