import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Home from './components/pages/Home';
import SportsHub from './components/pages/SportsHub';
import WatchList from './components/pages/WatchList';
import MemberPages from './components/pages/MemberPages';
import MemberProfile from './components/pages/MemberProfile';
import LeaguesPage from './components/pages/LeaguesPage';
import LeaguePlayerPage from './LeaguePlayerPage';
import LoginModal from './components/auth/LoginModal';
import OwnerDashboard from './components/admin/OwnerDashboard';
import LastFmPage from './components/pages/LastFmPage';
import RoadToTheShow from './components/pages/RoadToTheShow';
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
//   #leagues           → Vitza League
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
  };
}

function pushHash(page, sub1) {
  const parts = [page, sub1].filter(Boolean);
  const next = '#' + parts.join('/');
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}

// ── Games sub-page ───────────────────────────────────────────
const GamesPage = () => {
  const [subTab, setSubTab] = React.useState('rtts');
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(0,255,255,0.1)', overflowX: 'auto' }}>
        <button
          onClick={() => setSubTab('rtts')}
          style={{ padding: '10px 20px', background: subTab === 'rtts' ? 'rgba(0,255,255,0.12)' : 'none', border: 'none', borderBottom: subTab === 'rtts' ? '2px solid var(--color-cyan)' : '2px solid transparent', color: subTab === 'rtts' ? 'var(--color-cyan)' : 'rgba(192,208,255,0.5)', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.88rem' }}
        >
          Road to the Show SIM
        </button>
        <button
          onClick={() => setSubTab('more')}
          style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'rgba(192,208,255,0.35)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.88rem' }}
        >
          More Games (Coming Soon)
        </button>
      </div>
      {subTab === 'rtts' && <RoadToTheShow />}
      {subTab === 'more' && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(192,208,255,0.35)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎮</div>
          <p>More games coming soon!</p>
        </div>
      )}
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
  const [currentPage, setCurrentPage] = useState(() => parseHash().page);
  const [routeSub,    setRouteSub]    = useState(() => parseHash().sub1);

  // Handle browser back / forward
  useEffect(() => {
    const handler = () => {
      const { page, sub1 } = parseHash();
      setCurrentPage(page);
      setRouteSub(sub1 || null);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // ── Other state ───────────────────────────────────────────
  const [lfmToken,             setLfmToken]             = useState(null);
  const [showDashboard,        setShowDashboard]        = useState(false);
  const [showLoginModal,       setShowLoginModal]       = useState(false);
  const [signUpMode,           setSignUpMode]           = useState(false);
  const [selectedLeaguePlayer, setSelectedLeaguePlayer] = useState(null);
  const [selectedLeague,       setSelectedLeague]       = useState('vitza');

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

  const handleSelectPlayer = (player, league = 'vitza') => {
    setSelectedLeaguePlayer(player);
    setSelectedLeague(league);
    setCurrentPage('player');
    // Player detail is ephemeral — no URL change needed
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
      <div style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: '#0a0a23' }}>
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

      case 'watchlist':
        return <WatchList onSignIn={() => setShowLoginModal(true)} />;

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
        return <GamesPage />;

      case 'store':
        return (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(192,208,255,0.4)' }}>
            Store coming soon
          </div>
        );

      case 'player':
        return (
          <LeaguePlayerPage
            player={selectedLeaguePlayer}
            onBack={() => { setCurrentPage('leagues'); pushHash('leagues'); }}
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
