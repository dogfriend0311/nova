import React, { useState } from 'react';
import NABBLeague from '../../NABBLeague';
import RBMLLeague from '../../RBMLLeague';
import './LeaguesPage.css';

const LeaguesPage = ({ onSelectPlayer }) => {
  const [activeLeague, setActiveLeague] = useState('nabb');

  return (
    <div className="leagues-page">
      <div className="leagues-switcher">
        <button
          className={`league-switch-btn ${activeLeague === 'nabb' ? 'active' : ''}`}
          onClick={() => setActiveLeague('nabb')}
        >
          ⚾ NABB
        </button>
        <button
          className={`league-switch-btn ${activeLeague === 'rbml' ? 'active' : ''}`}
          onClick={() => setActiveLeague('rbml')}
        >
          ⚾ RBML
        </button>
      </div>

      {activeLeague === 'nabb' ? (
        <NABBLeague onSelectPlayer={(p) => onSelectPlayer(p, 'nabb')} />
      ) : (
        <RBMLLeague onSelectPlayer={(p) => onSelectPlayer(p, 'rbml')} />
      )}
    </div>
  );
};

export default LeaguesPage;