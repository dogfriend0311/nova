import React from 'react';
import ViztaLeague from '../../ViztaLeague';
import './LeaguesPage.css';

const LeaguesPage = ({ onSelectPlayer }) => {
  return (
    <div className="leagues-page">
      <ViztaLeague onSelectPlayer={(p) => onSelectPlayer(p, 'vizta')} />
    </div>
  );
};

export default LeaguesPage;
