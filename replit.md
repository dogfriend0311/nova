# Nova - Space Themed Social Gaming Hub

## Overview
Nova is a space-themed social gaming hub and sports platform for community engagement. Users can track sports statistics (NFL, MLB, NBA, NHL), view Roblox league rankings, share gaming clips, and maintain social profiles.

## Architecture
- **Frontend**: React 18 (Create React App / react-scripts)
- **Auth/Data**: Supabase (PostgreSQL + Auth) — also uses localStorage for local auth fallback
- **Styling**: CSS3 with custom space theme, CSS variables, animations
- **State**: React Context API (AuthContext), Zustand available
- **HTTP**: Axios for external API calls

## Project Structure
- `src/App.jsx` — Root app with routing via state
- `src/context/AuthContext.jsx` — Auth provider (localStorage-based + Supabase)
- `src/components/` — UI components (layout, pages, auth, admin, space)
- `src/services/` — supabaseClient.js, robloxService.js, sportsService.js
- `src/styles/` — globals.css, theme.css, animations.css, space.css, responsive.css
- `supabase/` — SQL migration files

## Running the App
- **Dev command**: `npm start` (runs on port 5000, host 0.0.0.0)
- **Workflow**: "Start application" — webview on port 5000
- **Deployment**: Static site — `npm run build` → `build/` directory

## Environment Variables
- `REACT_APP_SUPABASE_URL` — Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` — Supabase anonymous key
- `REACT_APP_ENV` — development/production

## Admin Login
- Username: `x0afterhoursx0` / Password: `Chiefsfan87` (owner role)

## Notes
- Host check disabled via `DANGEROUSLY_DISABLE_HOST_CHECK=true` for Replit proxy compatibility
- `fast-uri` manually installed to fix workbox-build dependency issue with Node 20
