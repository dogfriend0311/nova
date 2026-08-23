import React, { useState, useEffect } from 'react';
import { Activity, ChevronRight, Radio, Star } from 'lucide-react';
import ViztaLeague from '../../ViztaLeague';
import db from '../../services/db';
import { currentUsername, getFollowedTeams, getFavoritePlayers, onFavoritesChange } from '../../services/favoritesService';
import { SPORTS, SPORT_ORDER } from '../../data/sportsConfig';
import './LeaguesPage.css';

/* Quick-access strip of starred teams/players for the active league so
   they're one click away every time Leagues is opened, instead of
   digging into Rosters/Players/Watchlist to find them again. */
const FavoritesStrip = ({ league, onJumpToTeam, onSelectPlayer }) => {
  const [favTeams, setFavTeams] = useState([]);
  const [favPlayers, setFavPlayers] = useState([]);
  const username = currentUsername();

  useEffect(() => {
    if (!username) { setFavTeams([]); setFavPlayers([]); return; }
    let active = true;
    const load = () => {
      Promise.all([
        getFollowedTeams(username, league),
        getFavoritePlayers(username, league),
        db.getPlayers(league),
      ]).then(([teams, players, allPlayers]) => {
        if (!active) return;
        setFavTeams(teams);
        // Resolve to full player records so clicking opens a real stat page.
        const byId = new Map(allPlayers.map(p => [String(p.id), p]));
        setFavPlayers(players.map(p => byId.get(String(p.player_id || p.playerId))).filter(Boolean));
      }).catch(() => {});
    };
    load();
    return onFavoritesChange(load);
  }, [league, username]);

  if (!username || (favTeams.length === 0 && favPlayers.length === 0)) return null;

  return (
    <div className="leagues-favorites-strip">
      <span className="leagues-favorites-label"><Star size={13} fill="currentColor" /> Your Favorites</span>
      <div className="leagues-favorites-chips">
        {favTeams.map(t => (
          <button key={`team-${t.team_name}`} className="leagues-fav-chip team" onClick={() => onJumpToTeam(t.team_name)}>
            {t.team_name}
          </button>
        ))}
        {favPlayers.map(p => (
          <button key={`player-${p.id}`} className="leagues-fav-chip player" onClick={() => onSelectPlayer(p)}>
            {p.nickname || p.player_name}
          </button>
        ))}
      </div>
    </div>
  );
};

const LeaguesPage = ({ onSelectPlayer }) => {
  const [league, setLeagueState] = useState(() => {
    try {
      const last = localStorage.getItem('nova_last_league_sport');
      return (last && SPORTS[last]) ? last : 'vizta';
    } catch { return 'vizta'; }
  });
  // Wraps setLeague so every switch (tab click or deep link) also updates
  // the "continue where you left off" record read by Home's quick-launch tile.
  const setLeague = (id) => {
    setLeagueState(id);
    try { localStorage.setItem('nova_last_league_sport', id); } catch {}
  };
  const [jumpTeam, setJumpTeam] = useState(() => {
    try {
      const pending = JSON.parse(localStorage.getItem('nova_pending_team_jump') || 'null');
      return pending?.teamName || null;
    } catch { return null; }
  });
  const [jumpCounter, setJumpCounter] = useState(0);
  const activeSport = SPORTS[league];

  // Consume the "jump to this team" handoff left by CommandPalette's global
  // search (a team result can't set this component's local state directly,
  // so it drops a breadcrumb in localStorage instead — read once, then
  // cleared so it doesn't re-trigger on a later unrelated visit).
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nova_pending_team_jump');
      if (!raw) return;
      localStorage.removeItem('nova_pending_team_jump');
      const pending = JSON.parse(raw);
      if (pending?.sport && SPORTS[pending.sport]) setLeague(pending.sport);
      if (pending?.teamName) { setJumpTeam(pending.teamName); setJumpCounter(c => c + 1); }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jumpToTeam = (teamName) => {
    setJumpTeam(teamName);
    setJumpCounter(c => c + 1);
  };

  const changeLeague = (key) => {
    setLeague(key);
    setJumpTeam(null);
  };

  return (
    <div className="leagues-page">
      <div className="leagues-network-header">
        <div>
          <div className="leagues-network-eyebrow"><Radio size={13} /> NOVA SPORTS NETWORK <span>•</span> LIVE DATA</div>
          <h1>League Central</h1>
          <p>Every Roblox league, every matchup, every meaningful stat — in one command center.</p>
        </div>
        <div className="leagues-network-signal">
          <span className="leagues-signal-dot" />
          <span><b>SYNCED</b><small>Rivestack data layer</small></span>
          <Activity size={18} />
        </div>
      </div>

      <div className="leagues-switcher">
        {SPORT_ORDER.map(key => (
          <button
            key={key}
            className={`league-switch-btn ${league === key ? 'active' : ''}`}
            style={{ '--sw-accent': SPORTS[key].accent }}
            onClick={() => changeLeague(key)}
          >
            <span className="league-switch-icon">{SPORTS[key].icon}</span>
            <span className="league-switch-copy">
              <strong>{SPORTS[key].shortLabel}</strong>
              <small>{SPORTS[key].label}</small>
            </span>
            {league === key && <ChevronRight size={15} className="league-switch-arrow" />}
          </button>
        ))}
      </div>
      <div className="league-context-strip" style={{ '--context-accent': activeSport.accent }}>
        <span className="league-context-kicker">CURRENT LEAGUE</span>
        <strong>{activeSport.icon} {activeSport.label}</strong>
        <span className="league-context-divider" />
        <span>Live league center</span>
        <span className="league-context-spacer" />
        <span className="league-context-badge"><span /> Updated from league data</span>
      </div>

      <FavoritesStrip
        league={league}
        onJumpToTeam={jumpToTeam}
        onSelectPlayer={(p) => onSelectPlayer(p, league)}
      />

      <ViztaLeague
        key={jumpTeam ? `${league}-rosters-${jumpTeam}-${jumpCounter}` : league}
        sport={league}
        onSelectPlayer={(p) => onSelectPlayer(p, league)}
        initialTab={jumpTeam ? 'rosters' : 'overview'}
        initialTeam={jumpTeam}
      />
    </div>
  );
};

export default LeaguesPage;
