import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import fantasyDb from '../../services/fantasyDb';
import LeagueDetail from '../fantasy/LeagueDetail';
import { CreateLeagueModal, JoinLeagueModal } from '../fantasy/CreateJoinModals';
import { SPORTS, sportIcon, sportLabel } from '../fantasy/fantasyUtils';
import '../fantasy/FantasyHub.css';

const FantasyHub = ({ initialSport, onSignIn }) => {
  const { user } = useAuth();
  const [sport, setSport] = useState(initialSport && SPORTS.some(s => s.id === initialSport) ? initialSport : 'nfl');
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [activeLeagueId, setActiveLeagueId] = useState(null);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const list = await fantasyDb.getLeaguesForUser(user.username);
    setLeagues(list);
    setLoading(false);
    return list;
  };

  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Continue where you left off" — auto-resume the last fantasy league
  // this user opened (see openLeague below), as long as it's still one
  // of their leagues. Runs once the initial league list has loaded.
  useEffect(() => {
    if (!user || loading || activeLeagueId) return;
    try {
      const last = JSON.parse(localStorage.getItem(`nova_last_fantasy_league_${user.username}`) || 'null');
      if (last?.id && leagues.some(l => l.id === last.id)) {
        setSport(last.sport || sport);
        setActiveLeagueId(last.id);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const openLeague = (league) => {
    if (user) {
      localStorage.setItem(`nova_last_fantasy_league_${user.username}`, JSON.stringify({ id: league.id, name: league.name, sport: league.sport }));
    }
    setActiveLeagueId(league.id);
  };

  if (!user) {
    return (
      <div className="fantasy-hub">
        <div className="fantasy-hero">
          <h1 className="gradient-text-cyan">Fantasy Sports</h1>
          <p>Sign in to create or join fantasy leagues across NFL, NBA, MLB, and NHL.</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button className="neon-button" onClick={onSignIn}>Sign In</button>
        </div>
      </div>
    );
  }

  if (activeLeagueId) {
    return (
      <div className="fantasy-hub">
        <LeagueDetail leagueId={activeLeagueId} username={user.username} onBack={() => { setActiveLeagueId(null); load(); }} />
      </div>
    );
  }

  const visibleLeagues = leagues.filter(l => l.sport === sport);

  const handleCreate = async (settings, teamName) => {
    const { league } = await fantasyDb.createLeague(settings, user.username, teamName);
    setShowCreate(false);
    await load();
    openLeague(league);
  };

  const handleJoin = async (code, teamName) => {
    const { league } = await fantasyDb.joinLeague(code, user.username, teamName);
    setShowJoin(false);
    await load();
    openLeague(league);
  };

  return (
    <div className="fantasy-hub">
      <div className="fantasy-hero">
        <h1 className="gradient-text-cyan">Fantasy Sports</h1>
        <p>Draft, manage, and battle it out across NFL, NBA, MLB &amp; NHL leagues.</p>
      </div>

      <div className="sport-tabs">
        {SPORTS.map(s => (
          <button key={s.id} className={`sport-tab ${sport === s.id ? 'active' : ''}`} onClick={() => setSport(s.id)}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="fantasy-actions">
        <button className="neon-button" onClick={() => setShowCreate(true)}>+ Create League</button>
        <button className="neon-button neon-button-magenta" onClick={() => setShowJoin(true)}>Join League</button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Loading your leagues…</p>
      ) : visibleLeagues.length === 0 ? (
        <div className="empty-state">
          No {sportLabel(sport)} leagues yet. Create one or join with an invite code to get started.
        </div>
      ) : (
        <div className="league-grid">
          {visibleLeagues.map(l => (
            <div key={l.id} className="neon-card league-card" onClick={() => openLeague(l)}>
              <span className={`status-badge status-${l.status}`}>{l.status}</span>
              <h3>{sportIcon(l.sport)} {l.name}</h3>
              <div className="meta">
                <span className="pill">{l.format}</span>
                <span className="pill">{l.draft_type === 'auction' ? 'Auction' : 'Snake'}</span>
                <span className="pill">{l.scoring_type === 'roto' ? 'Roto' : 'H2H'}</span>
                <span className="pill">{l.num_teams} teams</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateLeagueModal defaultSport={sport} onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {showJoin && <JoinLeagueModal onClose={() => setShowJoin(false)} onJoin={handleJoin} />}
    </div>
  );
};

export default FantasyHub;
