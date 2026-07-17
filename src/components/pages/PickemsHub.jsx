import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import pickemsDb from '../../services/pickemsDb';
import { SPORTS, sportIcon, todayYYYYMMDD } from '../fantasy/fantasyUtils';
import '../fantasy/FantasyHub.css';

const CreateGroupModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [sport, setSport] = useState('nfl');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Group name is required.'); return; }
    try { await onCreate(name.trim(), sport); } catch (err) { setError(err.message); }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="gradient-text-cyan">Create a Pick'ems Group</h2>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Group Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office Pick'ems" />
          </div>
          <div className="form-row">
            <label>Sport</label>
            <select value={sport} onChange={(e) => setSport(e.target.value)}>
              {SPORTS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
            </select>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="neon-button">Create Group</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const JoinGroupModal = ({ onClose, onJoin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { await onJoin(code.trim().toUpperCase()); } catch (err) { setError(err.message); }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="gradient-text-cyan">Join a Pick'ems Group</h2>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Invite Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '2px', fontWeight: 700 }} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="neon-button">Join Group</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GroupDetail = ({ group, username, onBack }) => {
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    const [g, p, lb] = await Promise.all([
      pickemsDb.getGames(group.sport),
      pickemsDb.getUserPicks(group.id, username),
      pickemsDb.getLeaderboard(group.id),
    ]);
    setGames(g);
    setPicks(p);
    setLeaderboard(lb);
    setLoading(false);
  };

  useEffect(() => { load(); }, [group.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = async () => {
    setSyncing(true);
    try { await pickemsDb.syncGamesFromEspn(group.sport, todayYYYYMMDD()); } catch { /* ESPN unreachable */ }
    setSyncing(false);
    load();
  };

  const pickFor = (gameId) => picks.find(p => p.game_id === gameId);

  const submit = async (gameId, side) => {
    await pickemsDb.submitPick(group.id, username, gameId, side);
    load();
  };

  return (
    <div>
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 14 }}>← All Groups</button>
      <div className="league-header">
        <div>
          <h1>{sportIcon(group.sport)} {group.name}</h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Pick winners, earn coins, climb the leaderboard.</p>
        </div>
        <div className="invite-chip" onClick={() => navigator.clipboard?.writeText(group.invite_code)} title="Click to copy">
          Invite Code: <strong>{group.invite_code}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Today's Games</h2>
        <button className="btn-ghost" onClick={sync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync from ESPN'}</button>
      </div>

      {loading ? <p style={{ color: 'var(--color-text-tertiary)' }}>Loading…</p> : games.length === 0 ? (
        <div className="empty-state">No games cached yet. Click "Sync from ESPN" to pull today's schedule.</div>
      ) : games.map(g => {
        const mine = pickFor(g.id);
        const isFinal = g.status === 'final';
        return (
          <div key={g.id} className="neon-card matchup-card">
            <button
              className="matchup-team"
              style={{ background: 'none', border: 'none', cursor: isFinal ? 'default' : 'pointer', color: mine?.picked_side === 'away' ? 'var(--color-cyan)' : 'var(--color-text-primary)' }}
              disabled={isFinal}
              onClick={() => submit(g.id, 'away')}
            >
              {g.away_team} {isFinal && <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{g.away_score}</div>}
              {mine?.picked_side === 'away' && <div style={{ fontSize: '0.7rem' }}>YOUR PICK</div>}
            </button>
            <div className="matchup-vs">{isFinal ? 'FINAL' : g.status === 'live' ? 'LIVE' : '@'}</div>
            <button
              className="matchup-team"
              style={{ background: 'none', border: 'none', cursor: isFinal ? 'default' : 'pointer', color: mine?.picked_side === 'home' ? 'var(--color-cyan)' : 'var(--color-text-primary)' }}
              disabled={isFinal}
              onClick={() => submit(g.id, 'home')}
            >
              {g.home_team} {isFinal && <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{g.home_score}</div>}
              {mine?.picked_side === 'home' && <div style={{ fontSize: '0.7rem' }}>YOUR PICK</div>}
            </button>
          </div>
        );
      })}

      <h2 style={{ marginTop: 30 }}>Leaderboard</h2>
      <table className="standings-table">
        <thead><tr><th>#</th><th>Member</th><th>Coins</th><th>Correct Picks</th></tr></thead>
        <tbody>
          {leaderboard.map((m, i) => (
            <tr key={m.id}>
              <td>{i + 1}</td>
              <td>{m.username}</td>
              <td>{m.coins}</td>
              <td>{m.correct_picks}/{m.total_picks}</td>
            </tr>
          ))}
          {leaderboard.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>No members yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

const PickemsHub = ({ onSignIn }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(null);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setGroups(await pickemsDb.getGroupsForUser(user.username));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return (
      <div className="fantasy-hub">
        <div className="fantasy-hero">
          <h1 className="gradient-text-cyan">Pick'ems</h1>
          <p>Sign in to pick game winners and climb the leaderboard.</p>
        </div>
        <div style={{ textAlign: 'center' }}><button className="neon-button" onClick={onSignIn}>Sign In</button></div>
      </div>
    );
  }

  const activeGroup = groups.find(g => g.id === activeGroupId);
  if (activeGroup) {
    return <div className="fantasy-hub"><GroupDetail group={activeGroup} username={user.username} onBack={() => { setActiveGroupId(null); load(); }} /></div>;
  }

  const handleCreate = async (name, sport) => {
    const group = await pickemsDb.createGroup(name, sport, user.username);
    setShowCreate(false);
    await load();
    setActiveGroupId(group.id);
  };

  const handleJoin = async (code) => {
    const group = await pickemsDb.joinGroup(code, user.username);
    setShowJoin(false);
    await load();
    setActiveGroupId(group.id);
  };

  return (
    <div className="fantasy-hub">
      <div className="fantasy-hero">
        <h1 className="gradient-text-cyan">Pick'ems</h1>
        <p>Pick game winners, earn coins, and top the leaderboard with your group.</p>
      </div>

      <div className="fantasy-actions">
        <button className="neon-button" onClick={() => setShowCreate(true)}>+ Create Group</button>
        <button className="neon-button neon-button-magenta" onClick={() => setShowJoin(true)}>Join Group</button>
      </div>

      {loading ? <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Loading your groups…</p> : groups.length === 0 ? (
        <div className="empty-state">No Pick'ems groups yet. Create one or join with an invite code.</div>
      ) : (
        <div className="league-grid">
          {groups.map(g => (
            <div key={g.id} className="neon-card league-card" onClick={() => setActiveGroupId(g.id)}>
              <h3>{sportIcon(g.sport)} {g.name}</h3>
              <div className="meta"><span className="pill">Code: {g.invite_code}</span></div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} onJoin={handleJoin} />}
    </div>
  );
};

export default PickemsHub;
