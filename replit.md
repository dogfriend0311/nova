# Nova - Space Themed Social Gaming Hub

## Overview
Nova is a space-themed social gaming hub for Roblox sports community. Members can view NABB (Roblox baseball) stats, manage profiles, watch gaming clips, and interact socially.

## Architecture
- **Frontend**: React 18 (Create React App / react-scripts 5.0.1)
- **Auth/Data**: localStorage (primary) + Supabase sync layer (cross-device)
- **Supabase**: `app_data` key/value table syncs all shared data across devices; `member_profiles` table also exists
- **Styling**: CSS3 with custom neon space theme, CSS variables, animations
- **State**: React Context API (AuthContext)
- **Port**: 5000 (HOST=0.0.0.0, DANGEROUSLY_DISABLE_HOST_CHECK=true)
- **Startup**: `src/index.jsx` loads Supabase → localStorage before React mounts; localStorage proxy auto-pushes writes to Supabase

## Project Structure
- `src/App.jsx` — Root app with state-based routing + selectedLeaguePlayer state
- `src/context/AuthContext.jsx` — localStorage auth, heartbeat online tracking
- `src/NABBLeague.jsx` — Full NABB league with 8 tabs: Overview, Rosters, Players, Leaders, Feed, Box Scores, Compare, Hall of Fame
- `src/LeaguePlayerPage.jsx` — Player stat card (trading card + aggregated stats)
- `src/components/admin/OwnerDashboard.jsx` — Full admin dashboard
- `src/components/pages/MemberProfile.jsx` — Discord-style own profile editor
- `src/components/pages/MemberPages.jsx` — Browse member profiles (Discord cards)
- `src/components/pages/SportsHub.jsx` — ESPN live scores/standings/news + game detail box score + player search
- `src/services/sportsDataService.js` — ESPN API: scoreboard, standings, news, game summary, athlete search/profile/stats
- `src/components/layout/Sidebar.jsx` — Real online members + live stats
- `src/components/pages/Home.jsx` — Real stats from localStorage
- `src/styles/` — globals.css, theme.css, animations.css, space.css, responsive.css

## localStorage Keys
| Key | Contents |
|-----|----------|
| `nova_users` | Registered users (username, password, role) |
| `nova_user` | Current logged-in user |
| `nova_online` | `{username: timestamp_ms}` — heartbeat map |
| `member_profiles` | Member profile objects |
| `nabb_teams` | NABB team records (name, color, logo_url) |
| `nabb_players` | Player records incl. batting/pitching base stats + season/career/advanced |
| `nabb_box_scores` | Per-game player stat lines (linked by game_id) |
| `nabb_bs_games` | Standalone box score games (NOT nabb_games) |
| `nabb_games` | Scheduled games (legacy, used by Game Feed) |
| `nabb_feed` | Live game event feed entries |
| `nabb_hof` | Hall of Fame inductees |
| `nova_clips` | Gaming clips |

## Admin Login
- Username: `x0afterhoursx0` / Password: `Chiefsfan87` (owner role, hardcoded in AuthContext)

## Roles Hierarchy
owner > cofounder > mod > nabb_helper > member > guest

## Running the App
- **Dev command**: `npm start` (workflow: "Start application")
- **Build**: `npm run build` → `build/` directory

## Key Features Implemented
- No email anywhere — signup/login username+password only
- Online heartbeat every 30s in AuthContext useEffect; filter by >5min in Sidebar/Home
- **NABBLeague tabs (8)**: Overview, Rosters (click team→roster→click player→stats), Players, League Leaders, Game Feed, Box Scores (team-grouped stats with player avatars), **Compare** (side-by-side career/season with team colors + stat highlighting), Hall of Fame
- **OwnerDashboard**: LeaguePlayersTab batting/pitching stats + team dropdown; NABBTeamsTab URL or upload; NABBRostersTab team→roster→stats; NABBBoxScoresTab team-grouped player stats per game
- **SportsHub tabs (4)**: Scores (clickable cards → ESPN game box score), Standings, News, **Players** (search by name → profile + season stats)
- **Game Detail View**: Click any Final/Live score card → ESPN summary with line score, team stats comparison, player stats by position group with headshots
- **Player Search**: Search any athlete by name → ESPN profile card + season stats by category
- Member profiles: Discord-style cards with banner, avatar, bio, Spotify embed, social links
- **Mobile layout**: Navbar stays single-row on all screen sizes (tabs scroll horizontally, no wrapping)
- ESLint strict: warnings treated as errors — no unused vars

## ESPN API Endpoints Used
- `site.api.espn.com/apis/site/v2/sports/{path}/scoreboard` — live scores
- `site.api.espn.com/apis/v2/sports/{path}/standings` — standings
- `site.api.espn.com/apis/site/v2/sports/{path}/news` — headlines
- `site.api.espn.com/apis/site/v2/sports/{path}/summary?event={id}` — game box score
- `site.web.api.espn.com/apis/common/v3/search?query={name}&type=athlete` — player search
- `site.api.espn.com/apis/site/v2/sports/{path}/athletes/{id}` — player profile
- `site.api.espn.com/apis/site/v2/sports/{path}/athletes/{id}/statistics` — season stats

## Notes
- `fast-uri` manually installed to fix workbox-build dependency issue with Node 20
- Host check disabled via `DANGEROUSLY_DISABLE_HOST_CHECK=true` for Replit proxy
- `package.json` pins `overrides.shell-quote` to `1.8.4` — the transitive version pulled in by `react-scripts` (1.8.3) is blocked by Replit's package security firewall
- `package.json` pins `devDependencies.typescript` to `^4.9.5` — without an explicit pin, npm hoisted an unrelated `typescript@7.x` (outside `react-scripts`' supported `^3.2.1 || ^4` range), which crashed `eslint-plugin-jest`/`@typescript-eslint` and broke both `npm start` (overlay: `Environment key "jest/globals" is unknown`) and `npm run build` (hard failure). Pinning `typescript` fixes both.
- **Deployment**: this app's real production home is Vercel + Supabase (see `homepage` field, `vercel.json`, `supabase/`) — Replit is used here for development/preview only, not as the production deployment target

## User preferences
- Do not treat Replit as the production deployment target for this project — production is Vercel (frontend) + Supabase (backend/db). Build/verify here, but don't suggest deploying via Replit unless asked.
- NABB player stat fields: career (hits/runs/rbis/home_runs/strike_outs/innings_pitched/strikeouts_pitched/hits_allowed/earned_runs) + season_ prefix versions + adv_/sv_ for advanced/savant stats
