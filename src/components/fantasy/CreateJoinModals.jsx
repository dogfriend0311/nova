import React, { useState } from 'react';
import { SPORTS } from './fantasyUtils';

export const CreateLeagueModal = ({ defaultSport, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState(defaultSport || 'nfl');
  const [format, setFormat] = useState('redraft');
  const [draftType, setDraftType] = useState('snake');
  const [scoringType, setScoringType] = useState('h2h_points');
  const [numTeams, setNumTeams] = useState(10);
  const [faabBudget, setFaabBudget] = useState(100);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('League name is required.'); return; }
    setBusy(true);
    setError('');
    try {
      await onCreate({
        name: name.trim(),
        sport,
        format,
        draft_type: draftType,
        scoring_type: scoringType,
        num_teams: Number(numTeams),
        faab_budget: Number(faabBudget),
      }, teamName.trim());
    } catch (err) {
      setError(err.message || 'Failed to create league.');
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="gradient-text-cyan">Create a League</h2>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>League Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Galaxy Gridiron League" />
          </div>
          <div className="form-row">
            <label>Your Team Name</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Rocket Squad" />
          </div>
          <div className="form-row">
            <label>Sport</label>
            <select value={sport} onChange={(e) => setSport(e.target.value)}>
              {SPORTS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
            </select>
          </div>
          <div className="form-row-inline">
            <div className="form-row">
              <label>Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="redraft">Redraft</option>
                <option value="keeper">Keeper</option>
                <option value="dynasty">Dynasty</option>
              </select>
            </div>
            <div className="form-row">
              <label>Draft Type</label>
              <select value={draftType} onChange={(e) => setDraftType(e.target.value)}>
                <option value="snake">Snake</option>
                <option value="auction">Auction</option>
              </select>
            </div>
          </div>
          <div className="form-row-inline">
            <div className="form-row">
              <label>Scoring</label>
              <select value={scoringType} onChange={(e) => setScoringType(e.target.value)}>
                <option value="h2h_points">H2H Points</option>
                <option value="roto">Rotisserie</option>
              </select>
            </div>
            <div className="form-row">
              <label># of Teams</label>
              <select value={numTeams} onChange={(e) => setNumTeams(e.target.value)}>
                {[4, 6, 8, 10, 12, 14, 16].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {draftType === 'auction' && (
            <div className="form-row">
              <label>Auction Budget (per team)</label>
              <input type="number" value={faabBudget} onChange={(e) => setFaabBudget(e.target.value)} min="1" />
            </div>
          )}
          {draftType !== 'auction' && (
            <div className="form-row">
              <label>Waiver FAAB Budget (per team)</label>
              <input type="number" value={faabBudget} onChange={(e) => setFaabBudget(e.target.value)} min="0" />
            </div>
          )}
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="neon-button" disabled={busy}>{busy ? 'Creating…' : 'Create League'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const JoinLeagueModal = ({ onClose, onJoin }) => {
  const [code, setCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) { setError('Invite code is required.'); return; }
    setBusy(true);
    setError('');
    try {
      await onJoin(code.trim().toUpperCase(), teamName.trim());
    } catch (err) {
      setError(err.message || 'Failed to join league.');
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="gradient-text-cyan">Join a League</h2>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Invite Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. AB12CD" style={{ letterSpacing: '2px', fontWeight: 700 }} />
          </div>
          <div className="form-row">
            <label>Your Team Name</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Rocket Squad" />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="neon-button" disabled={busy}>{busy ? 'Joining…' : 'Join League'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
