import React, { useEffect, useState } from 'react';
import fantasyDb from '../../services/fantasyDb';
import RosterPanel from './RosterPanel';
import StandingsPanel from './StandingsPanel';
import MatchupsPanel from './MatchupsPanel';
import DraftRoom from './DraftRoom';
import WaiversPanel from './WaiversPanel';
import TradesPanel from './TradesPanel';
import ChatPanel from './ChatPanel';
import PlayoffBracket from './PlayoffBracket';
import { sportIcon, sportLabel } from './fantasyUtils';

const TABS = [
  { id: 'roster', label: 'My Team' },
  { id: 'matchups', label: 'Matchups' },
  { id: 'standings', label: 'Standings' },
  { id: 'draft', label: 'Draft' },
  { id: 'waivers', label: 'Waivers' },
  { id: 'trades', label: 'Trades' },
  { id: 'playoffs', label: 'Playoffs' },
  { id: 'chat', label: 'Chat' },
];

const LeagueDetail = ({ leagueId, username, onBack }) => {
  const [league, setLeague] = useState(null);
  const [teams, setTeams] = useState([]);
  const [tab, setTab] = useState('roster');
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const load = async () => {
    const l = await fantasyDb.getLeague(leagueId);
    const t = await fantasyDb.getTeams(leagueId);
    setLeague(l);
    setTeams(t);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !league) return <p style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-tertiary)' }}>Loading league…</p>;

  const myTeam = teams.find(t => t.owner_username === username);
  const isCommissioner = league.commissioner_username === username;

  const copyInvite = () => {
    navigator.clipboard?.writeText(league.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  return (
    <div>
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 14 }}>← All Leagues</button>

      <div className="league-header">
        <div>
          <h1>{sportIcon(league.sport)} {league.name}</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            {sportLabel(league.sport)} · {league.format} · {league.draft_type === 'auction' ? 'Auction' : 'Snake'} Draft · {league.scoring_type === 'roto' ? 'Rotisserie' : 'H2H Points'}
          </p>
        </div>
        <div className="invite-chip" onClick={copyInvite} title="Click to copy">
          Invite Code: <strong>{league.invite_code}</strong> {copiedCode ? '✓ copied' : ''}
        </div>
      </div>

      <div className="league-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`league-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'roster' && (myTeam
        ? <RosterPanel league={league} myTeam={myTeam} />
        : <div className="empty-state">You don't have a team in this league.</div>)}

      {tab === 'matchups' && <MatchupsPanel league={league} teams={teams} isCommissioner={isCommissioner} />}

      {tab === 'standings' && <StandingsPanel teams={teams} scoringType={league.scoring_type} />}

      {tab === 'draft' && (
        <DraftRoom league={league} teams={teams} myTeam={myTeam} username={username} isCommissioner={isCommissioner} onLeagueChange={load} />
      )}

      {tab === 'waivers' && myTeam && (
        <WaiversPanel league={league} teams={teams} myTeam={myTeam} isCommissioner={isCommissioner} />
      )}

      {tab === 'trades' && myTeam && (
        <TradesPanel league={league} teams={teams} myTeam={myTeam} isCommissioner={isCommissioner} />
      )}

      {tab === 'playoffs' && (
        <PlayoffBracket league={league} teams={teams} isCommissioner={isCommissioner} />
      )}

      {tab === 'chat' && (
        <ChatPanel league={league} username={username} />
      )}
    </div>
  );
};

export default LeagueDetail;
