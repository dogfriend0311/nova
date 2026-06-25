import React from 'react';
import VitzaLeague from '../../VitzaLeague';
import './LeaguesPage.css';

const LeaguesPage = ({ onSelectPlayer }) => {
  return (
    <div className="leagues-page">
      <VitzaLeague onSelectPlayer={(p) => onSelectPlayer(p, 'vitza')} />
    </div>
  );
};

export default LeaguesPage;
