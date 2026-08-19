import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Home from './components/pages/Home';
import SportsHub from './components/pages/SportsHub';
import MemberPages from './components/pages/MemberPages';
import MessagesPage from './components/pages/MessagesPage';
import MemberProfile from './components/pages/MemberProfile';
import LeaguesPage from './components/pages/LeaguesPage';
import LeaguePlayerPage from './LeaguePlayerPage';
import LoginModal from './components/auth/LoginModal';
import OwnerDashboard from './components/pages/OwnerDashboard';
import FantasyHub from './components/pages/FantasyHub';
import PickemsHub from './components/pages/PickemsHub';
import PropBets from './components/pages/PropBets';
import PlayoffPools from './components/pages/PlayoffPools';
import CoinShop from './components/pages/CoinShop';
import ArticlesPage from './components/pages/ArticlesPage';
import NovaWrapped from './components/pages/NovaWrapped';
import RobloxTracker from './components/pages/RobloxTracker';
import MusicHub from './components/pages/MusicHub';
import DiamondLeague from './components/pages/baseball/DiamondLeague';
// Lazy-loaded so the Perfect Athlete game (and its player data) ships in
// its own JS chunk — it no longer loads as part of the baseball simulation bundle.
const BuildPerfectAthlete = React.lazy(() => import('./components/pages/baseball/BuildPerfectAthlete'));
import EmbedPlayerCard from './components/EmbedPlayerCard';
import InstallPrompt from './components/InstallPrompt';
import DailyRewardToast from './components/DailyRewardToast';
import AllTimeLeaderboard from './components/AllTimeLeaderboard';
import './styles/globals.css';
import './styles/theme.css';
import './styles/animations.css';
import './styles/space.css';
import './styles/responsive.css';

// ── Hash router helpers ──────────────────────────────────────
function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '') || 'home';
  const parts = raw.split('/');
  return {
    page: parts[0] || 'home',
    sub1: parts[1] || null,
    sub2: parts[2] || null,
  };
}

function pushHash(page, sub1, sub2) {
  const parts = [page, sub1, sub2].filter(Boolean);
  const next = '#' + parts.join('/');
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}

// ── Games tab — Fantasy, Pick'ems, RTTS, Prop Bets, Playoff Pools ──
// NOTE: Beat Battle moved to Music tab
const GamesPage = ({ onSignIn, initialTab = 'fantasy', user: gamesUser }) => {
  const [subTab, setSubTab] = React.useState(initialTab);
  const tb = (id, label) => (
    <button
      onClick={() => setSubTab(id)}
      style={{
        padding: '10px 16px',
        background: subTab === id ? 'rgba(94,129,244,0.12)' : 'none',
        border: 'none',
        borderBottom: subTab === id ? '2px solid var(--color-cyan)' : '2px solid transparent',
        color: subTab === id ? 'var(--color-cyan)' : 'rgba(158,165,196,0.5)',
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontSize: '0.88rem',
        minHeight: '44px',
      }}
    >{label}</button>
  );
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(94,129,244,0.1)', overflowX: 'auto', marginBottom: '20px', scrollbarWidth: 'none' }}>
        {tb('fantasy',  '🏈 Fantasy')}
        {tb('pickems',  "✅ Pick'ems")}
        {tb('propbets', '🎯 Prop Bets')}
        {tb('playoffs', '🏆 Playoff Pools')}
        {tb('alltime',  '📊 All-Time')}
      </div>
      {subTab === 'fantasy'  && <FantasyHub onSignIn={onSignIn} />}
      {subTab === 'pickems'  && <PickemsHub onSignIn={onSignIn} />}
      {subTab === 'propbets' && <PropBets user={gamesUser} />}
      {subTab === 'playoffs' && <PlayoffPools user={gamesUser} />}
      {subTab === 'alltime'  && <AllTimeLeaderboard />}
    </div>
  );
};

// ── Store tab — Coin Shop + future store items ──────────────
const StorePage = ({ user }) => {
  return <CoinShop user={user} />;
};

// ── Main app content ─────────────────────────────────────────
const AppContent = () => {
  const { user, logout } = useAuth();

  // Load owner-added custom stats (per league) once on boot so getSport()
  // in sportsConfig.js can merge them in everywhere it's used.
  useEffect(() => {
    import('./services/db').then(({ default: db }) => {
      import('./data/sportsConfig').then(({ setCustomStats }) => {
        ['vizta', 'hockey', 'football'].forEach((lg) => {
          db.getCustomStats(lg).then((list) => setCustomStats(lg, list)).catch(() => {});
        });
      });
    });
  }, []);

  const [coins, setCoins] = useState(() => {
    if (!user?.username) return 0;
    return parseInt(localStorage.getItem(`nova_coins_${user?.username}`) || '0');
  });

  useEffect(() => {
    if (user?.username) {
      setCoins(parseInt(localStorage.getItem(`nova_coins_${user.username}`) || '0'));
    }
  }, [user]);

  // ── Route state — driven by URL hash ──────────────────────
  const [currentPage, setCurrentPage] = useState(() => {
    const { page, sub1 } = parseHash();
    if (page === 'leagues' && sub1 === 'player') return 'player';
    // Redirect legacy routes
    if (page === 'radio' || page === 'lastfm') return 'music';
    if (page === 'coinshop') return 'store';
    return page;
  });
  const [routeSub, setRouteSub] = useState(() => parseHash().sub1);

  // Handle browser back / forward
  useEffect(() => {
    const handler = () => {
      const { page, sub1, sub2 } = parseHash();
      if (page === 'leagues' && sub1 === 'player' && sub2) {
        setCurrentPage('player');
        setRouteSub(sub1);
        import('./services/db').then(({ default: db }) => {
          Promise.all(['vizta', 'hockey', 'football'].map(lg => db.getPlayers(lg).then(players => ({ lg, found: players.find(p => String(p.id) === String(sub2)) })).catch(() => ({ lg, found: null }))))
            .then(results => {
              const hit = results.find(r => r.found);
              if (hit) { setSelectedLeaguePlayer(hit.found); setSelectedLeague(hit.lg); }
              else { setCurrentPage('leagues'); pushHash('leagues'); }
            });
        });
      } else {
        // Redirect legacy routes
        const resolved = (page === 'radio' || page === 'lastfm') ? 'music'
          : page === 'coinshop' ? 'store'
          : page;
        setCurrentPage(resolved);
        setRouteSub(sub1 || null);
        if (resolved !== 'player') setSelectedLeaguePlayer(null);
      }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On initial mount: load player if URL is a player deep-link
  useEffect(() => {
    const { page, sub1, sub2 } = parseHash();
    if (page === 'leagues' && sub1 === 'player' && sub2) {
      import('./services/db').then(({ default: db }) => {
        Promise.all(['vizta', 'hockey', 'football'].map(lg => db.getPlayers(lg).then(players => ({ lg, found: players.find(p => String(p.id) === String(sub2)) })).catch(() => ({ lg, found: null }))))
          .then(results => {
            const hit = results.find(r => r.found);
            if (hit) { setSelectedLeaguePlayer(hit.found); setSelectedLeague(hit.lg); }
            else { setCurrentPage('leagues'); pushHash('leagues'); }
          });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Other state ───────────────────────────────────────────
  const [showDashboard,        setShowDashboard]        = useState(false);
  const [showLoginModal,       setShowLoginModal]       = useState(false);
  const [signUpMode,           setSignUpMode]           = useState(false);
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState(null);
  const [selectedLeague,       setSelectedLeague]       = useState('vizta');
  // musicInitialTab — lets external nav links open a specific music sub-tab
  const [musicInitialTab,      setMusicInitialTab]      = useState(null);

  // ── Navigation ────────────────────────────────────────────
  const handlePageChange = (page, sub1) => {
    if (page === 'profile' && !user) { setShowLoginModal(true); return; }
    // Handle legacy deep links
    if (page === 'radio') {
      setCurrentPage('music');
      setMusicInitialTab('radio');
      pushHash('music');
      return;
    }
    if (page === 'lastfm') {
      setCurrentPage('music');
      setMusicInitialTab('lastfm');
      pushHash('music');
      return;
    }
    if (page === 'coinshop') {
      setCurrentPage('store');
      pushHash('store');
      return;
    }
    setCurrentPage(page);
    setRouteSub(sub1 || null);
    setSelectedLeaguePlayer(null);
    setMusicInitialTab(null);
    pushHash(page, sub1);
  };

  const handleSelectPlayer = (player, league = 'vizta') => {
    setSelectedLeaguePlayer(player);
    setSelectedLeague(league);
    setCurrentPage('player');
    pushHash('leagues', 'player', String(player.id));
  };

  const handleMemberSelect = (username) => {
    if (username) {
      setRouteSub(username);
      pushHash('members', username);
    } else {
      setRouteSub(null);
      pushHash('members');
    }
  };

  const handleArticleSelect = (id) => {
    if (id) {
      setRouteSub(id);
      pushHash('articles', id);
    } else {
      setRouteSub(null);
      pushHash('articles');
    }
  };

  // ── Dashboard full-screen override ───────────────────────
  if (showDashboard) {
    return (
      <div style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: '#0a0d1a' }}>
        <OwnerDashboard onExit={() => setShowDashboard(false)} />
      </div>
    );
  }

  // ── Page renderer ─────────────────────────────────────────
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={handlePageChange} user={user} />;

      case 'sports':
        return <SportsHub initialSport={routeSub} />;

      case 'fantasy':
        return <GamesPage key="games-fantasy" onSignIn={() => setShowLoginModal(true)} initialTab="fantasy" user={user} />;

      case 'pickems':
        return <GamesPage key="games-pickems" onSignIn={() => setShowLoginModal(true)} initialTab="pickems" user={user} />;

      case 'leagues':
        return <LeaguesPage onSelectPlayer={handleSelectPlayer} />;

      case 'members':
        return (
          <MemberPages
            targetUsername={routeSub}
            onMemberSelect={handleMemberSelect}
          />
        );

      case 'messages':
        return <MessagesPage initialUsername={routeSub} onSignIn={() => setShowLoginModal(true)} />;

      case 'profile':
        return user ? <MemberProfile /> : <Home />;

      // ── Unified music tab (Radio + Last.fm + Beat Battle + Visualizer) ──
      case 'music':
        return <MusicHub user={user} initialTab={musicInitialTab} onSignIn={() => setShowLoginModal(true)} />;

      case 'games':
        return <GamesPage key="games-default" onSignIn={() => setShowLoginModal(true)} initialTab="fantasy" user={user} />;

      case 'articles':
        return <ArticlesPage initialArticleId={routeSub} onArticleSelect={handleArticleSelect} />;

      // ── Store tab now includes Coin Shop ──
      case 'store':
      case 'coinshop': // backward compat
        return <StorePage user={user} />;

      case 'wrapped':
        return <NovaWrapped user={user} />;

      case 'roblox':
        return <RobloxTracker user={user} />;

      case 'simulations':
      case 'diamond': // backward compat
        return <DiamondLeague user={user} />;

      case 'perfectathlete':
        return (
          <React.Suspense fallback={<div style={{ textAlign: 'center', padding: '60px', color: 'rgba(158, 165, 196,0.4)' }}>Loading…</div>}>
            <BuildPerfectAthlete user={user} />
          </React.Suspense>
        );

      case 'player':
        if (!selectedLeaguePlayer) {
          return (
            <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(158, 165, 196,0.4)' }}>
              Loading player…
            </div>
          );
        }
        return (
          <LeaguePlayerPage
            player={selectedLeaguePlayer}
            onBack={() => { setSelectedLeaguePlayer(null); setCurrentPage('leagues'); pushHash('leagues'); }}
            leaguePrefix={selectedLeague}
          />
        );

      default:
        return <Home />;
    }
  };

  return (
    <>
      <Layout
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onDashboard={() => setShowDashboard(true)}
        onSignIn={() => { setSignUpMode(false); setShowLoginModal(true); }}
        onSignUp={() => { setSignUpMode(true); setShowLoginModal(true); }}
        onLogout={logout}
        user={user}
        coins={coins}
      >
        {renderPage()}
      </Layout>

      <InstallPrompt />
      <DailyRewardToast />

      {showLoginModal && (
        <LoginModal
          initialTab={signUpMode ? 'signup' : 'login'}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </>
  );
};

// Embeddable Stat Cards: URLs like #embed/player/<league>/<id> render a
// standalone, chrome-free, unauthenticated card meant to live inside a
// third-party <iframe> — so they skip AuthProvider/Layout entirely rather
// than loading the whole authenticated app inside someone else's page.
const isEmbedRoute = () => window.location.hash.replace(/^#\/?/, '').startsWith('embed/player/');

const App = () => {
  const [embed, setEmbed] = useState(isEmbedRoute);

  useEffect(() => {
    const handler = () => setEmbed(isEmbedRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (embed) return <EmbedPlayerCard />;

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
