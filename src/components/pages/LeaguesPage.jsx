import React, { useState } from 'react';
import { Activity, ChevronRight, Radio } from 'lucide-react';
import ViztaLeague from '../../ViztaLeague';
import { SPORTS, SPORT_ORDER } from '../../data/sportsConfig';
import './LeaguesPage.css';

const LeaguesPage = ({ onSelectPlayer }) => {
  const [league, setLeague] = useState('vizta');
  const activeSport = SPORTS[league];

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
            onClick={() => setLeague(key)}
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
      <ViztaLeague sport={league} onSelectPlayer={(p) => onSelectPlayer(p, league)} />
    </div>
  );
};

export default LeaguesPage;
