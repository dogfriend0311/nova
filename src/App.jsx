import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Home from './components/pages/Home';
import SportsHub from './components/pages/SportsHub';
import MemberPages from './components/pages/MemberPages';
import MemberProfile from './components/pages/MemberProfile';
import LeaguesPage from './components/pages/LeaguesPage';
import LeaguePlayerPage from './LeaguePlayerPage';
import LoginModal from './components/auth/LoginModal';
import OwnerDashboard from './components/admin/OwnerDashboard';
import LastFmPage from './components/pages/LastFmPage';
import RoadToTheShow from './components/pages/RoadToTheShow';
import FantasyHub from './components/pages/FantasyHub';
import PickemsHub from './components/pages/PickemsHub';
import './styles/globals.css';
import './styles/theme.css';
import './styles/animations.css';
import './styles/space.css';
import './styles/responsive.css';

// ── Hash router helpers ──────────────────────────────────────
// URL scheme:
//   #home
//   #sports            → Sports Hub (defaults to MLB)
//   #sports/nfl        → Sports Hub with NFL active
//   #sports/mlb        → Sports Hub with MLB active
//   #leagues           → Vizta League
//   #members           → Member list
//   #members/username  → That user's profile directly
//   #watchlist
//   #lastfm
//   #games
//   #store
//   #profile           → Own profile

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

// ── Games tab — houses Fantasy, Pick'ems, and RTTS ──────────
const GamesPage = ({ onSignIn, initialTab = 'fantasy' }) => {
  const [subTab, setSubTab] = React.useState(initialTab);
  const tb = (id, label) => (
    <button
      onClick={() => setSubTab(id)}
      style={{
        padding: '10px 20px', background: subTab === id ? 'rgba(94,129,244,0.12)' : 'none',
        border: 'none', borderBottom: subTab === id ? '2px solid var(--color-cyan)' : '2px solid transparent',
        color: subTab === id ? 'var(--color-cyan)' : 'rgba(158,165,196,0.5)',
        fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.88rem',
      }}
    >{label}</button>
  );
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(94,129,244,0.1)', overflowX: 'auto', marginBottom: '20px' }}>
        {tb('fantasy', '🏈 Fantasy')}
        {tb('pickems', "✅ Pick'ems")}
        {tb('rtts',    '⚾ Road to the Show SIM')}
      </div>
      {subTab === 'fantasy' && <FantasyHub onSignIn={onSignIn} />}
      {subTab === 'pickems' && <PickemsHub onSignIn={onSignIn} />}
      {subTab === 'rtts'    && <RoadToTheShow />}
    </div>
  );
};

// ── Main app content ─────────────────────────────────────────
const AppContent = () => {
  const { user, logout } = useAuth();

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
  // #leagues/player/ID → start on player view (data loaded by effect below)
  const [currentPage, setCurrentPage] = useState(() => {
    const { page, sub1 } = parseHash();
    if (page === 'leagues' && sub1 === 'player') return 'player';
    return page;
  });
  const [routeSub,    setRouteSub]    = useState(() => parseHash().sub1);

  // Handle browser back / forward
  useEffect(() => {
    const handler = () => {
      const { page, sub1, sub2 } = parseHash();
      if (page === 'leagues' && sub1 === 'player' && sub2) {
        // Player deep-link via browser history navigation
        setCurrentPage('player');
        setRouteSub(sub1);
        import('./services/db').then(({ default: db }) => {
          db.getPlayers('vizta').then(players => {
            const found = players.find(p => String(p.id) === String(sub2));
            if (found) { setSelectedLeaguePlayer(found); setSelectedLeague('vizta'); }
            else { setCurrentPage('leagues'); pushHash('leagues'); }
          }).catch(() => { setCurrentPage('leagues'); pushHash('leagues'); });
        });
      } else {
        setCurrentPage(page);
        setRouteSub(sub1 || null);
        if (page !== 'player') setSelectedLeaguePlayer(null);
      }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // On initial mount: load player if URL is a player deep-link
  // e.g. someone opens a shared link like #leagues/player/abc123
  useEffect(() => {
    const { page, sub1, sub2 } = parseHash();
    if (page === 'leagues' && sub1 === 'player' && sub2) {
      import('./services/db').then(({ default: db }) => {
        db.getPlayers('vizta').then(players => {
          const found = players.find(p => String(p.id) === String(sub2));
          if (found) { setSelectedLeaguePlayer(found); setSelectedLeague('vizta'); }
          else { setCurrentPage('leagues'); pushHash('leagues'); }
        }).catch(() => { setCurrentPage('leagues'); pushHash('leagues'); });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Other state ───────────────────────────────────────────
  const [lfmToken,             setLfmToken]             = useState(null);
  const [showDashboard,        setShowDashboard]        = useState(false);
  const [showLoginModal,       setShowLoginModal]       = useState(false);
  const [signUpMode,           setSignUpMode]           = useState(false);
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState(null);
  const [selectedLeague,       setSelectedLeague]       = useState('vizta');

  // Handle Last.fm OAuth token in query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      window.history.replaceState({}, '', window.location.pathname);
      setLfmToken(token);
      handlePageChange('lastfm');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ────────────────────────────────────────────
  const handlePageChange = (page, sub1) => {
    if (page === 'profile' && !user) { setShowLoginModal(true); return; }
    setCurrentPage(page);
    setRouteSub(sub1 || null);
    setSelectedLeaguePlayer(null);
    pushHash(page, sub1);
  };

  const handleSelectPlayer = (player, league = 'vizta') => {
    setSelectedLeaguePlayer(player);
    setSelectedLeague(league);
    setCurrentPage('player');
    // Push a shareable URL: #leagues/player/PLAYER_ID
    pushHash('leagues', 'player', String(player.id));
  };

  // Called by MemberPages when a profile is opened or closed
  const handleMemberSelect = (username) => {
    if (username) {
      setRouteSub(username);
      pushHash('members', username);
    } else {
      setRouteSub(null);
      pushHash('members');
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
        return <Home />;

      case 'sports':
        // routeSub can be a sport id like 'mlb', 'nfl', etc.
        return <SportsHub initialSport={routeSub} />;

      // fantasy / pickems / watchlist all fold into the Games tab now
      case 'fantasy':
        return <GamesPage key="games-fantasy" onSignIn={() => setShowLoginModal(true)} initialTab="fantasy" />;

      case 'pickems':
        return <GamesPage key="games-pickems" onSignIn={() => setShowLoginModal(true)} initialTab="pickems" />;

      case 'leagues':
        return <LeaguesPage onSelectPlayer={handleSelectPlayer} />;

      case 'members':
        // routeSub can be a username to auto-open that profile
        return (
          <MemberPages
            targetUsername={routeSub}
            onMemberSelect={handleMemberSelect}
          />
        );

      case 'profile':
        return user ? <MemberProfile /> : <Home />;

      case 'lastfm':
        return (
          <LastFmPage
            pendingToken={lfmToken}
            onTokenConsumed={() => setLfmToken(null)}
          />
        );

      case 'games':
        return <GamesPage key="games-default" onSignIn={() => setShowLoginModal(true)} initialTab="fantasy" />;

      case 'store':
        return (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(158, 165, 196,0.4)' }}>
            Store coming soon
          </div>
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

      {showLoginModal && (
        <LoginModal
          initialTab={signUpMode ? 'signup' : 'login'}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
