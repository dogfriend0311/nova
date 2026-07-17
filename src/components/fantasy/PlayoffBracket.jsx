import React, { useEffect, useState, useCallback } from 'react';
import fantasyDb from '../../services/fantasyDb';

/* ─── Bracket sizing rules ────────────────────────────────────────────────
   ≤ 8 teams  → top 4 qualify  (2 rounds: Semi + Final)
   9–12 teams → top 6 qualify  (with 2 byes in round 1: 3 rounds: QF + SF + F)
   > 12 teams → top 8 qualify  (3 rounds: QF + SF + Final)
   ────────────────────────────────────────────────────────────────────────── */
function getPlayoffFieldSize(numTeams) {
  if (numTeams <= 8) return 4;
  if (numTeams <= 12) return 6;
  return 8;
}

/* Return ordered round labels for a given number of rounds */
function getRoundLabels(numRounds) {
  const labels = ['Final', 'Semifinal', 'Quarterfinal', 'Round of 16'];
  // labels[0] = Final, labels[1] = SF, etc.
  return labels.slice(0, numRounds).reverse(); // earliest round first
}

/* Seed sorted teams into bracket slots with byes for non-power-of-two fields.
   Seeding: 1 vs last, 2 vs second-last, … (standard bracket seeding) */
function buildFirstRoundPairings(seededTeams) {
  const n = seededTeams.length;
  // Find next power of two >= n
  let slots = 1;
  while (slots < n) slots *= 2;

  // Place seeds into slots: seed 1 vs seed `slots`, seed 2 vs seed `slots-1`, …
  const pairings = [];
  for (let i = 0; i < slots / 2; i++) {
    const teamA = seededTeams[i] || null;        // higher seed (or bye slot)
    const teamB = seededTeams[slots - 1 - i] || null; // lower seed (or bye slot)
    pairings.push({ teamA, teamB });
  }
  return pairings;
}

/* Sort teams same as StandingsPanel (h2h_points default) */
function sortTeams(teams) {
  return [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.points_for - a.points_for;
  });
}

/* Determine winner of a matchup (null if incomplete / bye-only) */
function getWinner(matchup, teamsById) {
  if (!matchup) return null;
  if (!matchup.team_b_id) return teamsById[matchup.team_a_id] || null; // bye → team_a advances
  const aScore = Number(matchup.team_a_score || 0);
  const bScore = Number(matchup.team_b_score || 0);
  if (aScore === 0 && bScore === 0) return null;
  return aScore >= bScore
    ? teamsById[matchup.team_a_id] || null
    : teamsById[matchup.team_b_id] || null;
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function ScoreInput({ label, value, onChange, disabled }) {
  return (
    <div className="pb-score-field">
      <span className="pb-score-label">{label}</span>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="pb-score-input"
      />
    </div>
  );
}

function MatchupCard({ matchup, teamsById, isCommissioner, onSaveScore }) {
  const teamA = teamsById[matchup.team_a_id];
  const teamB = matchup.team_b_id ? teamsById[matchup.team_b_id] : null;
  const winner = getWinner(matchup, teamsById);

  const [scoreA, setScoreA] = useState(String(matchup.team_a_score || ''));
  const [scoreB, setScoreB] = useState(String(matchup.team_b_score || ''));
  const [saving, setSaving] = useState(false);

  // Sync when matchup updates externally
  useEffect(() => {
    setScoreA(String(matchup.team_a_score || ''));
    setScoreB(String(matchup.team_b_score || ''));
  }, [matchup.team_a_score, matchup.team_b_score]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveScore(matchup.id, parseFloat(scoreA) || 0, parseFloat(scoreB) || 0);
    } finally {
      setSaving(false);
    }
  };

  const isBye = !matchup.team_b_id;
  const aWon = winner && winner.id === matchup.team_a_id;
  const bWon = winner && matchup.team_b_id && winner.id === matchup.team_b_id;

  return (
    <div className={`pb-matchup-card neon-card ${isBye ? 'pb-bye' : ''}`}>
      <div className={`pb-team ${aWon ? 'pb-winner' : ''}`}>
        <span className="pb-team-name">{teamA ? teamA.team_name : 'TBD'}</span>
        {!isBye && isCommissioner ? (
          <ScoreInput
            label=""
            value={scoreA}
            onChange={setScoreA}
            disabled={saving}
          />
        ) : (
          <span className="pb-team-score">{isBye ? '—' : (matchup.team_a_score || '0')}</span>
        )}
        {aWon && <span className="pb-crown">👑</span>}
      </div>

      {isBye ? (
        <div className="pb-vs pb-bye-label">BYE</div>
      ) : (
        <>
          <div className="pb-vs">vs</div>
          <div className={`pb-team ${bWon ? 'pb-winner' : ''}`}>
            <span className="pb-team-name">{teamB ? teamB.team_name : 'TBD'}</span>
            {isCommissioner ? (
              <ScoreInput
                label=""
                value={scoreB}
                onChange={setScoreB}
                disabled={saving}
              />
            ) : (
              <span className="pb-team-score">{matchup.team_b_score || '0'}</span>
            )}
            {bWon && <span className="pb-crown">👑</span>}
          </div>
          {isCommissioner && (
            <button
              className="pb-save-btn btn-ghost"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '…' : 'Save'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function BracketRound({ label, matchups, teamsById, isCommissioner, onSaveScore }) {
  return (
    <div className="pb-round">
      <div className="pb-round-label gradient-text-cyan">{label}</div>
      <div className="pb-round-matchups">
        {matchups.map(m => (
          <MatchupCard
            key={m.id}
            matchup={m}
            teamsById={teamsById}
            isCommissioner={isCommissioner}
            onSaveScore={onSaveScore}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

const PlayoffBracket = ({ league, teams, isCommissioner }) => {
  const [playoffMatchups, setPlayoffMatchups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [champion, setChampion] = useState(null);

  const teamsById = Object.fromEntries((teams || []).map(t => [t.id, t]));

  const loadMatchups = useCallback(async () => {
    if (!league?.id) return;
    setLoading(true);
    setError(null);
    try {
      const all = await fantasyDb.getMatchups(league.id);
      const playoff = (all || []).filter(m => m.is_playoff);
      setPlayoffMatchups(playoff);
    } catch (e) {
      setError('Failed to load playoff matchups.');
    } finally {
      setLoading(false);
    }
  }, [league?.id]);

  useEffect(() => { loadMatchups(); }, [loadMatchups]);

  // Determine champion whenever matchups update
  useEffect(() => {
    if (!playoffMatchups.length) { setChampion(null); return; }
    const finals = playoffMatchups.filter(m => m.round_label === 'Final');
    if (!finals.length) { setChampion(null); return; }
    const finalMatchup = finals[0];
    const w = getWinner(finalMatchup, teamsById);
    setChampion(w || null);
  }, [playoffMatchups, teamsById]);

  /* ── Generate round 1 ────────────────────────────────────────────────── */
  const handleGenerateBracket = async () => {
    setGenerating(true);
    setError(null);
    try {
      const fieldSize = getPlayoffFieldSize(league.num_teams || 10);
      const sorted = sortTeams(teams || []);
      const qualified = sorted.slice(0, fieldSize);
      const pairings = buildFirstRoundPairings(qualified);

      const numRounds = Math.ceil(Math.log2(Math.max(fieldSize, 2)));
      const labels = getRoundLabels(numRounds); // e.g. ['Quarterfinal','Semifinal','Final']
      const round1Label = labels[0];
      const week = league.current_week || 1;

      const created = [];
      for (const { teamA, teamB } of pairings) {
        if (!teamA) continue; // shouldn't happen
        const m = await fantasyDb.createMatchup({
          league_id: league.id,
          week,
          team_a_id: teamA.id,
          team_b_id: teamB ? teamB.id : null,
          team_a_score: 0,
          team_b_score: 0,
          is_playoff: true,
          round_label: round1Label,
        });
        created.push(m);
      }

      // Update league status to playoffs
      try {
        await fantasyDb.updateLeague(league.id, { status: 'playoffs' });
      } catch (_) {}

      await loadMatchups();
    } catch (e) {
      setError('Failed to generate bracket: ' + (e.message || e));
    } finally {
      setGenerating(false);
    }
  };

  /* ── Generate next round ─────────────────────────────────────────────── */
  const handleGenerateNextRound = async () => {
    setGenerating(true);
    setError(null);
    try {
      // Find the latest round
      const rounds = [...new Set(playoffMatchups.map(m => m.round_label))];
      const fieldSize = getPlayoffFieldSize(league.num_teams || 10);
      const numRounds = Math.ceil(Math.log2(Math.max(fieldSize, 2)));
      const allLabels = getRoundLabels(numRounds);

      const latestRoundLabel = rounds[rounds.length - 1];
      const latestRoundIdx = allLabels.indexOf(latestRoundLabel);
      if (latestRoundIdx === -1 || latestRoundIdx >= allLabels.length - 1) {
        setError('No further rounds to generate.');
        setGenerating(false);
        return;
      }

      const nextRoundLabel = allLabels[latestRoundIdx + 1];
      const latestMatchups = playoffMatchups.filter(m => m.round_label === latestRoundLabel);

      // All must have a winner
      const winners = latestMatchups.map(m => getWinner(m, teamsById));
      if (winners.some(w => !w)) {
        setError('All matchups in the current round must have a winner before advancing.');
        setGenerating(false);
        return;
      }

      // Pair winners: 1 vs 2, 3 vs 4, …
      const week = (league.current_week || 1) + latestRoundIdx + 1;
      for (let i = 0; i < winners.length; i += 2) {
        const teamA = winners[i];
        const teamB = winners[i + 1] || null;
        await fantasyDb.createMatchup({
          league_id: league.id,
          week,
          team_a_id: teamA.id,
          team_b_id: teamB ? teamB.id : null,
          team_a_score: 0,
          team_b_score: 0,
          is_playoff: true,
          round_label: nextRoundLabel,
        });
      }

      // If we just created the Final, mark status=playoffs (already done) — mark complete after Final finishes
      await loadMatchups();
    } catch (e) {
      setError('Failed to generate next round: ' + (e.message || e));
    } finally {
      setGenerating(false);
    }
  };

  /* ── Score save handler ──────────────────────────────────────────────── */
  const handleSaveScore = async (matchupId, scoreA, scoreB) => {
    await fantasyDb.updateMatchup(matchupId, {
      team_a_score: scoreA,
      team_b_score: scoreB,
    });
    await loadMatchups();
  };

  /* ── Compute bracket structure for rendering ─────────────────────────── */
  const fieldSize = getPlayoffFieldSize(league?.num_teams || 10);
  const numRounds = Math.ceil(Math.log2(Math.max(fieldSize, 2)));
  const allLabels = getRoundLabels(numRounds);

  const roundsData = allLabels.map(label => ({
    label,
    matchups: playoffMatchups.filter(m => m.round_label === label),
  }));

  const hasPlayoffMatchups = playoffMatchups.length > 0;
  const isEligible = league && league.current_week >= (league.playoff_start_week || 15);

  // Determine if we can generate next round
  const existingRoundLabels = [...new Set(playoffMatchups.map(m => m.round_label))];
  const latestLabel = existingRoundLabels[existingRoundLabels.length - 1];
  const latestLabelIdx = allLabels.indexOf(latestLabel);
  const canAdvance =
    hasPlayoffMatchups &&
    latestLabelIdx < allLabels.length - 1 &&
    playoffMatchups
      .filter(m => m.round_label === latestLabel)
      .every(m => getWinner(m, teamsById) !== null);

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        Loading playoff bracket…
      </div>
    );
  }

  return (
    <div className="pb-container">
      {/* Header */}
      <div className="pb-header">
        <h2 style={{ margin: 0 }}>
          <span className="gradient-text-cyan">🏆 Playoff Bracket</span>
        </h2>
        <div className="pb-header-actions">
          {isCommissioner && !hasPlayoffMatchups && (
            <>
              {!isEligible && (
                <span className="pb-eligibility-msg">
                  Playoffs begin week {league.playoff_start_week || 15}. Current week: {league.current_week || 1}.
                </span>
              )}
              <button
                className="neon-button"
                onClick={handleGenerateBracket}
                disabled={generating || !isEligible}
                title={!isEligible ? `Not yet eligible — starts week ${league.playoff_start_week || 15}` : 'Generate the playoff bracket'}
              >
                {generating ? 'Generating…' : '⚡ Generate Playoff Bracket'}
              </button>
            </>
          )}
          {isCommissioner && hasPlayoffMatchups && canAdvance && !champion && (
            <button
              className="neon-button"
              onClick={handleGenerateNextRound}
              disabled={generating}
            >
              {generating ? 'Generating…' : `▶ Generate ${allLabels[latestLabelIdx + 1]}`}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Champion banner */}
      {champion && (
        <div className="pb-champion-banner neon-card">
          <div className="pb-champion-trophy">🏆</div>
          <div>
            <div className="pb-champion-title gradient-text-cyan">League Champion</div>
            <div className="pb-champion-name">{champion.team_name}</div>
            <div className="pb-champion-owner">({champion.owner_username})</div>
          </div>
        </div>
      )}

      {/* Bracket tree */}
      {hasPlayoffMatchups ? (
        <div className="pb-bracket">
          {roundsData.map(({ label, matchups }) =>
            matchups.length > 0 ? (
              <BracketRound
                key={label}
                label={label}
                matchups={matchups}
                teamsById={teamsById}
                isCommissioner={isCommissioner}
                onSaveScore={handleSaveScore}
              />
            ) : null
          )}
        </div>
      ) : (
        <div className="empty-state">
          {isCommissioner
            ? isEligible
              ? 'Click "Generate Playoff Bracket" to seed the playoffs from regular-season standings.'
              : `The playoff bracket will be available starting week ${league.playoff_start_week || 15}.`
            : `The playoff bracket hasn't been generated yet. Check back after week ${league.playoff_start_week || 15}.`}
        </div>
      )}

      {/* Seeding preview (before bracket is generated) */}
      {!hasPlayoffMatchups && teams && teams.length > 0 && (
        <div className="pb-seeding neon-card" style={{ marginTop: 24 }}>
          <div className="pb-seeding-title">Projected Playoff Seeds</div>
          <table className="standings-table">
            <thead>
              <tr>
                <th>Seed</th><th>Team</th><th>W</th><th>L</th><th>Pts For</th>
              </tr>
            </thead>
            <tbody>
              {sortTeams(teams).slice(0, fieldSize).map((t, i) => (
                <tr key={t.id}>
                  <td>
                    <span className={`pb-seed-badge ${i === 0 ? 'pb-seed-1' : ''}`}>#{i + 1}</span>
                  </td>
                  <td>
                    {t.team_name}{' '}
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.78rem' }}>
                      ({t.owner_username})
                    </span>
                  </td>
                  <td>{t.wins}</td>
                  <td>{t.losses}</td>
                  <td>{Number(t.points_for).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: 6 }}>
            Top {fieldSize} of {teams.length} teams qualify
            {fieldSize === 6 ? ' (2 byes for seeds 1–2)' : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayoffBracket;
