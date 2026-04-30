# Nova - Space Themed Social Gaming Hub

Welcome to **Nova**, a stunning space-themed social platform where gaming enthusiasts can share clips, favorite songs, track sports statistics, and compete in Roblox leagues!

## 🚀 Features

- **Stunning Space Theme**: Futuristic UI with animated starfield and flying rockets
- **Member Pages**: Create profiles with gaming clips and favorite songs
- **Live Sports Integration**: Real-time scores and stats for NFL, MLB, NBA, NHL
- **Roblox League Stats**: Track league rankings, match history, and achievements
- **Hub Dashboard**: Aggregated real-time data and trending content
- **Modular Architecture**: Clean separation of concerns for easy maintenance
- **Real-time Updates**: Supabase integration for live data synchronization

## 📋 Project Structure

```
nova/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── layout/        # Navbar, Sidebar, Layout
│   │   ├── space/         # StarField, Rocket animations
│   │   ├── pages/         # Home, Hub, RobloxStats, MemberPages
│   │   ├── sports/        # Sports widget components
│   │   ├── member/        # Member profile components
│   │   ├── hub/           # Hub-specific components
│   │   └── common/        # Reusable components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API integration services
│   │   ├── supabaseClient.js
│   │   ├── sportsService.js
│   │   └── robloxService.js
│   ├── styles/            # Global & theme styles
│   │   ├── globals.css
│   │   ├── theme.css
│   │   ├── animations.css
│   │   ├── space.css
│   │   └── responsive.css
│   ├── utils/             # Helper functions
│   ├── context/           # React Context for state management
│   ├── App.jsx            # Main App component
│   └── index.jsx          # React DOM render
├── .env.example           # Environment variables template
├── package.json           # Dependencies
├── vercel.json            # Vercel deployment config
└── README.md              # This file
```

## 🛠️ Tech Stack

- **Frontend**: React 18, CSS3 with CSS Variables
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **APIs**: Sports APIs (ESPN/TheSportsDB), Roblox API
- **Deployment**: Vercel
- **Version Control**: GitHub
- **State Management**: Zustand (optional, ready to integrate)
- **HTTP Client**: Axios

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- GitHub account
- Supabase account
- Vercel account

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/nova.git
cd nova

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy the environment template
cp .env.example .env.local

# Edit .env.local with your credentials
# REACT_APP_SUPABASE_URL=your_supabase_url
# REACT_APP_SUPABASE_ANON_KEY=your_anon_key
# REACT_APP_SPORTS_API_KEY=your_api_key
# REACT_APP_ROBLOX_API_KEY=your_roblox_key
```

### 3. Supabase Setup

1. Create a new Supabase project
2. Create the following tables in your Supabase database:

```sql
-- Members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  level INT DEFAULT 1,
  avatar_url VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Gaming clips table
CREATE TABLE gaming_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_url VARCHAR(255) NOT NULL,
  thumbnail_url VARCHAR(255),
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Favorite songs table
CREATE TABLE favorite_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  artist VARCHAR(200) NOT NULL,
  spotify_url VARCHAR(255),
  added_at TIMESTAMP DEFAULT NOW()
);

-- Sports stats table
CREATE TABLE sports_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league VARCHAR(10) NOT NULL,
  team_id VARCHAR(50),
  team_name VARCHAR(100),
  season INT,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Game scores table
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league VARCHAR(10) NOT NULL,
  game_id VARCHAR(100) UNIQUE,
  game_date DATE NOT NULL,
  home_team VARCHAR(100),
  away_team VARCHAR(100),
  home_score INT,
  away_score INT,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roblox stats table
CREATE TABLE roblox_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(100),
  level INT DEFAULT 1,
  league_rank INT,
  points INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

3. Enable Realtime for these tables in Supabase settings

### 4. Local Development

```bash
# Start the development server
npm start

# The app will open at http://localhost:3000
```

### 5. GitHub Setup

```bash
# Initialize git (if not already done)
git init

# Add files and create initial commit
git add .
git commit -m "Initial Nova commit"

# Add remote and push to GitHub
git remote add origin https://github.com/yourusername/nova.git
git branch -M main
git push -u origin main
```

### 6. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments on push.

## 🎨 Design System

### Color Palette
- **Primary Cyan**: `#00ffff`
- **Primary Magenta**: `#ff00ff`
- **Purple**: `#8a2be2`
- **Background Dark**: `#0a0a23`
- **Text Primary**: `#c0d0ff`

### Typography
- **Display Font**: Orbitron (futuristic)
- **Mono Font**: Space Mono (coding/data)
- **Body Font**: Roboto (readability)

### Animations
- **Star Twinkling**: Continuous
- **Rockets**: Every 10 seconds
- **Glow Effects**: Pulse animations
- **Transitions**: Smooth 0.3s ease

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Desktop (lg)**: 1025px+
- **Tablet (md)**: 769px - 1024px
- **Mobile (sm)**: 481px - 768px
- **Small Mobile (xs)**: 0px - 480px

## 🔌 API Integration

### Sports API
- Endpoint: `https://api.example-sports.com`
- Methods: NFL/MLB/NBA/NHL scores, stats, standings, news
- Real-time updates every 30 seconds in Hub

### Roblox API
- Uses official Roblox API + custom backend service
- Methods: User info, league stats, rankings, match history
- Real-time updates every 60 seconds

### Supabase
- PostgreSQL database with real-time subscriptions
- Authentication ready
- File storage for clips/images

## 🚀 Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Supabase tables created and indexed
- [ ] Sports API key obtained
- [ ] Roblox API configured
- [ ] GitHub repository configured
- [ ] Custom domain connected (optional)
- [ ] SSL certificate enabled
- [ ] Analytics configured
- [ ] Error logging setup
- [ ] Performance monitoring enabled

## 📊 Performance Tips

- Images are optimized and lazy-loaded
- CSS is minified and autoprefixed
- JavaScript is code-split
- Animations use CSS and canvas for performance
- Real-time updates are debounced
- Caching strategy implemented

## 🔐 Security

- Environment variables never exposed
- Supabase RLS (Row Level Security) policies recommended
- Input validation on all forms
- XSS protection with React's built-in escaping
- CSRF tokens for form submissions (add as needed)

## 📝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make changes and commit: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## 🐛 Troubleshooting

### Port 3000 already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm start
```

### Supabase connection issues
- Verify URL and anon key are correct
- Check that Supabase project is active
- Ensure RLS policies aren't blocking access

### API integration not working
- Verify API keys are correct
- Check rate limits haven't been exceeded
- Review API documentation for endpoint changes

## 📚 Resources

- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.io/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Sports APIs](https://rapidapi.com/search/sports)
- [Roblox API](https://developer.roblox.com/en-us/api)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Support

For issues, questions, or suggestions:
- Open a GitHub issue
- Contact: your-email@example.com

---

**Built with 🚀 for space-loving gamers**

*Nova is under active development. Features and APIs are subject to change.*
