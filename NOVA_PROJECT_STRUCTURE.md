# Nova - Space Themed Social Gaming Hub
## Project Structure & Setup Guide

### 🚀 Project Overview
Nova is a space-themed social hangout platform featuring:
- Member pages with gaming clips & favorite songs
- Live sports stats (NFL, MLB, NHL, NBA)
- Roblox league stats integration
- Animated space background with flying stars & rockets
- Real-time updates with Hub dashboard

---

## 📁 Directory Structure

```
nova/
├── public/
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Layout.jsx
│   │   ├── space/
│   │   │   ├── SpaceBackground.jsx
│   │   │   ├── StarField.jsx
│   │   │   └── RocketAnimation.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Hub.jsx
│   │   │   ├── RobloxStats.jsx
│   │   │   └── MemberPages.jsx
│   │   ├── sports/
│   │   │   ├── SportsWidget.jsx
│   │   │   ├── NFLScores.jsx
│   │   │   ├── MLBScores.jsx
│   │   │   ├── NHLScores.jsx
│   │   │   └── NBAScores.jsx
│   │   ├── member/
│   │   │   ├── MemberCard.jsx
│   │   │   ├── MemberProfile.jsx
│   │   │   ├── GamingClips.jsx
│   │   │   └── FavoriteSongs.jsx
│   │   ├── hub/
│   │   │   ├── LiveScores.jsx
│   │   │   ├── UpcomingGames.jsx
│   │   │   ├── TrendingMembers.jsx
│   │   │   └── ActivityFeed.jsx
│   │   └── common/
│   │       ├── Card.jsx
│   │       ├── Button.jsx
│   │       └── LoadingSpinner.jsx
│   ├── hooks/
│   │   ├── useSupabase.js
│   │   ├── useSportsAPI.js
│   │   ├── useRobloxAPI.js
│   │   └── useRealtime.js
│   ├── services/
│   │   ├── supabaseClient.js
│   │   ├── sportsService.js
│   │   ├── robloxService.js
│   │   ├── memberService.js
│   │   └── apiClient.js
│   ├── styles/
│   │   ├── globals.css
│   │   ├── theme.css
│   │   ├── animations.css
│   │   ├── space.css
│   │   └── responsive.css
│   ├── utils/
│   │   ├── dateFormatters.js
│   │   ├── validators.js
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── SportsContext.jsx
│   ├── App.jsx
│   └── index.jsx
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── vercel.json
├── supabase-migrations.sql
└── README.md
```

---

## 🛠️ Setup Instructions

### 1. Initialize Project
```bash
npx create-react-app nova
cd nova
```

### 2. Install Dependencies
```bash
npm install
npm install @supabase/supabase-js
npm install axios
npm install lucide-react
npm install zustand
```

### 3. Environment Variables
Create `.env.local`:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_SPORTS_API_KEY=your_sports_api_key
REACT_APP_ROBLOX_API_KEY=your_roblox_api_key
```

### 4. GitHub Setup
```bash
git init
git add .
git commit -m "Initial Nova commit"
git remote add origin https://github.com/yourusername/nova.git
git push -u origin main
```

### 5. Supabase Setup
- Create tables: members, gaming_clips, songs, sports_stats, scores, roblox_stats
- Enable realtime subscriptions
- Set up authentication

### 6. Vercel Deployment
```bash
npm install -g vercel
vercel
```

---

## 🎨 Design Philosophy
- **Aesthetic**: Retro-futuristic space theme
- **Color Palette**: Deep space blues, neon cyans, electric purples
- **Animations**: Smooth, continuous star field with periodic rocket fly-bys
- **Typography**: Futuristic fonts paired with readable body text

---

## 🔌 API Integrations
- **Sports Data**: ESPN API or TheSportsDB
- **Roblox Stats**: Roblox API (via unofficial endpoints or custom service)
- **Real-time Updates**: Supabase Realtime

---

## 📦 Component Organization
Each component is self-contained with its own:
- JSX file
- Styles (imported CSS modules or inline)
- Props documentation
- Error handling

This makes debugging easier and code more maintainable.
