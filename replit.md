# Nova - Space Themed Social Gaming Hub

## Overview
Nova is a space-themed social gaming hub for Roblox sports community. Members can view NABB (Roblox baseball) stats, manage profiles, watch gaming clips, and interact socially.

## Architecture
- **Frontend**: React 18 (Create React App / react-scripts 5.0.1)
- **Auth/Data**: localStorage only — no Supabase auth
- **Styling**: CSS3 with custom neon space theme, CSS variables, animations
- **State**: React Context API (AuthContext)
- **Port**: 5000 (HOST=0.0.0.0, DANGEROUSLY_DISABLE_HOST_CHECK=true)

## Project Structure
- `src/App.jsx` — Root app with state-based routing + selectedLeaguePlayer state
- `src/context/AuthContext.jsx` — localStorage auth, heartbeat online tracking
- `src/NABBLeague.jsx` — Full NABB league with 7 tabs (real localStorage data)
- `src/LeaguePlayerPage.jsx` — Player stat card (trading card + aggregated stats)
- `src/components/admin/OwnerDashboard.jsx` — Full admin dashboard
- `src/components/pages/MemberProfile.jsx` — Discord-style own profile editor
- `src/components/pages/MemberPages.jsx` — Browse member profiles (Discord cards)
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
| `nabb_players` | Player records incl. batting/pitching base stats |
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
- NABBLeague: Overview, Rosters (click team→roster→click player→stats), Players, League Leaders, Game Feed, Box Scores (standalone nabb_bs_games), Hall of Fame
- OwnerDashboard: LeaguePlayersTab has batting/pitching stats fields + team dropdown; NABBTeamsTab has URL or image upload; NABBRostersTab click team→roster→click player→stats; NABBBoxScoresTab standalone
- Member profiles: Discord-style cards with banner, avatar, bio, Spotify embed, social links
- ESLint strict: warnings treated as errors — no unused vars

## Notes
- `fast-uri` manually installed to fix workbox-build dependency issue with Node 20
- Host check disabled via `DANGEROUSLY_DISABLE_HOST_CHECK=true` for Replit proxy
