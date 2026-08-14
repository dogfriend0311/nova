import React, { useState } from 'react';
import ViztaLeague from '../../ViztaLeague';
import { SPORTS, SPORT_ORDER } from '../../data/sportsConfig';
import './LeaguesPage.css';

const LeaguesPage = ({ onSelectPlayer }) => {
  const [league, setLeague] = useState('vizta');

  return (
    <div className="leagues-page">
      <div className="leagues-switcher">
        {SPORT_ORDER.map(key => (
          <button
            key={key}
            className={`league-switch-btn ${league === key ? 'active' : ''}`}
            style={{ '--sw-accent': SPORTS[key].accent }}
            onClick={() => setLeague(key)}
          >
            <span className="league-switch-icon">{SPORTS[key].icon}</span>
            {SPORTS[key].shortLabel}
          </button>
        ))}
      </div>
      <ViztaLeague sport={league} onSelectPlayer={(p) => onSelectPlayer(p, league)} />
    </div>
  );
};

export default LeaguesPage;
