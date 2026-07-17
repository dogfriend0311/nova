import React, { useEffect, useState, useRef, useCallback } from 'react';
import fantasyDb from '../../services/fantasyDb';
import './FantasyHub.css';

/* ── helpers ─────────────────────────────────────────────────────── */
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const rosterSize = (rosterSettings) => {
  if (!rosterSettings || typeof rosterSettings !== 'object') return 15;
  return Object.values(rosterSettings).reduce((s, v) => s + (Number(v) || 0), 0) || 15;
};

/** Given a flat pick_order (round-1 order) and a 0-based pick index,
 *  returns { teamId, round, pickInRound } for a snake draft. */
const snakePickInfo = (pickOrder, pickIndex) => {
  const numTeams = pickOrder.length;
  if (numTeams === 0) return null;
  const round = Math.floor(pickIndex / numTeams); // 0-based round
  const posInRound = pickIndex % numTeams;
  const teamIdx = round % 2 === 0 ? posInRound : numTeams - 1 - posInRound;
  return {
    teamId: pickOrder[teamIdx],
    round: round + 1,
    pickInRound: posInRound + 1,
  };
};

const formatSeconds = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

/* ── main component ──────────────────────────────────────────────── */
const DraftRoom = ({ league, teams, myTeam, username, isCommissioner, onLeagueChange }) => {
  const [draft, setDraft] = useState(null);
  const [picks, setPicks] = useState([]);
  const [players, setPlayers] = useState([]);
  const [rosteredIds, setRosteredIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  // Auction-specific
  const [bidAmount, setBidAmount] = useState('');
  const [nominatePlayerId, setNominatePlayerId] = useState('');
  const [startingBid, setStartingBid] = useState(1);
  const [auctionTimer, setAuctionTimer] = useState(0);

  // Commissioner draft-start controls
  const [pickOrderDraft, setPickOrderDraft] = useState([]); // manual reorder

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const subDraftRef = useRef(null);
  const subPicksRef = useRef(null);

  const isAuction = league.draft_type === 'auction';

  /* ── data loading ─────────────────────────────────────────────── */
  const loadAll = useCallback(async () => {
    const [d, pl, rIds] = await Promise.all([
      fantasyDb.getDraft(league.id),
      fantasyDb.getPlayers(league.sport),
      fantasyDb.getLeagueRosteredPlayerIds(league.id),
    ]);
    setDraft(d);
    setRosteredIds(rIds);
    if (d) {
      const pk = await fantasyDb.getDraftPicks(d.id);
      setPicks(pk);
    }
    if (pl.length > 0) {
      setPlayers(pl);
    } else {
      // Auto-seed on first load
      setSyncing(true);
      try {
        const seeded = await fantasyDb.syncPlayerPoolFromEspn(league.sport);
        setPlayers(seeded);
      } catch {/* ESPN unreachable */ }
      setSyncing(false);
    }
    setLoading(false);
  }, [league.id, league.sport]);

  // Reload just draft + picks (cheap, used by polling & realtime callbacks)
  const refreshDraft = useCallback(async () => {
    const d = await fantasyDb.getDraft(league.id);
    setDraft(d);
    if (d) {
      const [pk, rIds] = await Promise.all([
        fantasyDb.getDraftPicks(d.id),
        fantasyDb.getLeagueRosteredPlayerIds(league.id),
      ]);
      setPicks(pk);
      setRosteredIds(rIds);
    }
  }, [league.id]);

  /* ── mount / unmount ──────────────────────────────────────────── */
  useEffect(() => {
    loadAll();

    // Realtime subscriptions (no-op if Supabase not configured)
    subDraftRef.current = fantasyDb.subscribeToChannel(
      `draft-${league.id}`, 'fantasy_drafts', 'league_id', league.id,
      () => refreshDraft()
    );
    // Note: fantasy_draft_picks filters on draft_id, which isn't known until
    // the draft exists — re-subscribed below once `draft` loads.

    // Polling fallback (every 4 s) when realtime is unavailable
    pollRef.current = setInterval(() => refreshDraft(), 4000);

    return () => {
      fantasyDb.unsubscribe(subDraftRef.current);
      fantasyDb.unsubscribe(subPicksRef.current);
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, [league.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-subscribe to picks once the draft row (and its id) is known.
  useEffect(() => {
    if (!draft?.id) return;
    const sub = fantasyDb.subscribeToChannel(
      `picks-${draft.id}`, 'fantasy_draft_picks', 'draft_id', draft.id,
      () => refreshDraft()
    );
    subPicksRef.current = sub;
    return () => fantasyDb.unsubscribe(sub);
  }, [draft?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── countdown timer (client-side) ───────────────────────────── */
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!draft || draft.status !== 'live') return;

    if (isAuction) {
      // Auction: count down to current_nomination.ends_at
      if (!draft.current_nomination?.ends_at) return;
      const tick = () => {
        const rem = Math.max(0, Math.round((new Date(draft.current_nomination.ends_at) - Date.now()) / 1000));
        setAuctionTimer(rem);
        if (rem <= 0) {
          clearInterval(timerRef.current);
          // Auto-close auction window if we are the commissioner
          if (isCommissioner) finalizeAuctionWinner(draft);
        }
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      // Snake: generic countdown from seconds_per_pick
      const spp = draft.seconds_per_pick || 60;
      setTimerSec(spp);
      timerRef.current = setInterval(() => {
        setTimerSec(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.status, draft?.current_pick_index, draft?.current_nomination?.ends_at]);

  /* ── derived state ────────────────────────────────────────────── */
  const teamById = Object.fromEntries((teams || []).map(t => [t.id, t]));
  const pickedPlayerIds = new Set(picks.map(p => p.player_id));

  const availablePlayers = players.filter(p =>
    !pickedPlayerIds.has(p.id) &&
    !rosteredIds.has(p.id) &&
    (search === '' || p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.position || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.team_abbr || '').toLowerCase().includes(search.toLowerCase()))
  );

  /* ── commissioner: start draft ───────────────────────────────── */
  const handleStartDraft = async () => {
    setActionErr('');
    try {
      const numRounds = rosterSize(league.roster_settings);
      const orderedTeamIds = pickOrderDraft.length > 0
        ? pickOrderDraft
        : shuffle((teams || []).map(t => t.id));

      let d = draft;
      if (!d) {
        d = await fantasyDb.createDraft(league.id, {
          rounds: numRounds,
          secondsPerPick: isAuction ? 90 : 60,
          teamOrder: orderedTeamIds,
        });
      }
      const updated = await fantasyDb.updateDraft(d.id, {
        status: 'live',
        pick_order: orderedTeamIds,
        started_at: new Date().toISOString(),
      });
      setDraft(updated);
      // Update league status to 'drafting'
      const updatedLeague = await fantasyDb.updateLeague(league.id, { status: 'drafting' });
      if (onLeagueChange) onLeagueChange(updatedLeague);
      setActionMsg('Draft started!');
    } catch (e) {
      setActionErr(e.message || 'Failed to start draft.');
    }
  };

  /* ── snake: make a pick ───────────────────────────────────────── */
  const handleSnakePick = async (player) => {
    if (!draft || draft.status !== 'live') return;
    const pickOrder = draft.pick_order || [];
    const info = snakePickInfo(pickOrder, draft.current_pick_index);
    if (!info) return;

    // Verify it's the current user's turn
    const onClockTeam = teamById[info.teamId];
    if (!onClockTeam || onClockTeam.owner_username !== username) {
      setActionErr("It's not your turn to pick.");
      return;
    }
    setActionErr('');
    try {
      const pickNumber = draft.current_pick_index + 1;
      await fantasyDb.makeDraftPick(draft.id, {
        pickNumber,
        round: info.round,
        teamId: info.teamId,
        playerId: player.id,
      });
      await fantasyDb.addToRoster(info.teamId, player.id, 'BENCH', 'draft');

      const totalPicks = pickOrder.length * draft.rounds;
      const nextIndex = draft.current_pick_index + 1;
      const isComplete = nextIndex >= totalPicks;
      const patch = isComplete
        ? { current_pick_index: nextIndex, status: 'complete', completed_at: new Date().toISOString() }
        : { current_pick_index: nextIndex };

      const updated = await fantasyDb.updateDraft(draft.id, patch);
      setDraft(updated);

      if (isComplete) {
        const updatedLeague = await fantasyDb.updateLeague(league.id, { status: 'active' });
        if (onLeagueChange) onLeagueChange(updatedLeague);
      }

      await refreshDraft();
      setActionMsg(`Drafted ${player.name}!`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (e) {
      setActionErr(e.message || 'Pick failed.');
    }
  };

  /* ── auction: nominate a player ───────────────────────────────── */
  const handleNominate = async () => {
    if (!draft || draft.status !== 'live' || !nominatePlayerId) return;
    const pickOrder = draft.pick_order || [];
    const nomTeamId = pickOrder[draft.nomination_team_index % pickOrder.length];
    const nomTeam = teamById[nomTeamId];
    if (!nomTeam || nomTeam.owner_username !== username) {
      setActionErr("It's not your turn to nominate.");
      return;
    }
    setActionErr('');
    const spp = draft.seconds_per_pick || 90;
    const endsAt = new Date(Date.now() + spp * 1000).toISOString();
    const nomination = {
      player_id: nominatePlayerId,
      high_bid: Number(startingBid) || 1,
      high_team_id: nomTeamId,
      ends_at: endsAt,
      nominated_by: nomTeamId,
    };
    const updated = await fantasyDb.updateDraft(draft.id, { current_nomination: nomination });
    setDraft(updated);
    setNominatePlayerId('');
    setStartingBid(1);
  };

  /* ── auction: place a bid ─────────────────────────────────────── */
  const handleBid = async () => {
    if (!draft?.current_nomination || !myTeam) return;
    const nom = draft.current_nomination;
    const bid = Number(bidAmount);
    if (!bid || bid <= nom.high_bid) {
      setActionErr(`Bid must be higher than current bid of $${nom.high_bid}.`);
      return;
    }
    const myFaab = myTeam.faab_balance ?? 0;
    if (bid > myFaab) {
      setActionErr(`Bid exceeds your FAAB balance ($${myFaab}).`);
      return;
    }
    setActionErr('');
    const updated = await fantasyDb.updateDraft(draft.id, {
      current_nomination: { ...nom, high_bid: bid, high_team_id: myTeam.id },
    });
    setDraft(updated);
    setBidAmount('');
  };

  /* ── auction: finalize winner (commissioner or auto) ─────────── */
  const finalizeAuctionWinner = async (currentDraft) => {
    const nom = currentDraft?.current_nomination;
    if (!nom) return;
    const player = players.find(p => p.id === nom.player_id);
    if (!player) return;

    try {
      const pickOrder = currentDraft.pick_order || [];
      const pickNumber = picks.length + 1;
      const round = Math.ceil(pickNumber / pickOrder.length);
      await fantasyDb.makeDraftPick(currentDraft.id, {
        pickNumber,
        round,
        teamId: nom.high_team_id,
        playerId: nom.player_id,
        bidAmount: nom.high_bid,
      });
      await fantasyDb.addToRoster(nom.high_team_id, nom.player_id, 'BENCH', 'draft');
      // Deduct FAAB
      const winnerTeam = teamById[nom.high_team_id];
      if (winnerTeam) {
        await fantasyDb.updateTeam(winnerTeam.id, {
          faab_balance: Math.max(0, (winnerTeam.faab_balance || 0) - nom.high_bid),
        });
      }

      // Advance nomination index
      const nextNomIdx = (currentDraft.nomination_team_index + 1) % pickOrder.length;
      const totalPicks = pickOrder.length * currentDraft.rounds;
      const isComplete = (picks.length + 1) >= totalPicks;
      const patch = isComplete
        ? { current_nomination: null, nomination_team_index: nextNomIdx, status: 'complete', completed_at: new Date().toISOString() }
        : { current_nomination: null, nomination_team_index: nextNomIdx };

      const updated = await fantasyDb.updateDraft(currentDraft.id, patch);
      setDraft(updated);

      if (isComplete) {
        const updatedLeague = await fantasyDb.updateLeague(league.id, { status: 'active' });
        if (onLeagueChange) onLeagueChange(updatedLeague);
      }
      await refreshDraft();
      setActionMsg(`${winnerTeam?.team_name || 'Team'} won ${player.name} for $${nom.high_bid}!`);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (e) {
      setActionErr(e.message || 'Failed to finalize auction pick.');
    }
  };

  /* ── draft board ─────────────────────────────────────────────── */
  const renderDraftBoard = () => {
    if (!draft || picks.length === 0) return null;
    const pickOrder = draft.pick_order || [];
    const numTeams = pickOrder.length;
    const rounds = draft.rounds || 15;

    // Build a 2-D grid: [round][pickInRound] = pick
    const grid = Array.from({ length: rounds }, () => Array(numTeams).fill(null));
    picks.forEach(pk => {
      const r = pk.round - 1;
      // find column: snake-aware team index in that round
      const colIdxNormal = pickOrder.indexOf(pk.team_id);
      const col = r % 2 === 0 ? colIdxNormal : numTeams - 1 - colIdxNormal;
      if (r >= 0 && r < rounds && col >= 0) grid[r][col] = pk;
    });

    const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

    return (
      <div className="draft-board-wrap">
        <h3 className="gradient-text-cyan" style={{ margin: '0 0 10px' }}>Draft Board</h3>
        <div className="draft-board-scroll">
          <table className="draft-board-table">
            <thead>
              <tr>
                <th className="db-round-cell">Rd</th>
                {pickOrder.map(tid => (
                  <th key={tid} className="db-team-header">
                    {teamById[tid]?.team_name || tid}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, rIdx) => (
                <tr key={rIdx}>
                  <td className="db-round-cell">{rIdx + 1}</td>
                  {row.map((pk, cIdx) => {
                    const p = pk ? playerMap[pk.player_id] : null;
                    return (
                      <td key={cIdx} className={`db-pick-cell ${pk ? 'db-pick-filled' : 'db-pick-empty'}`}>
                        {p ? (
                          <>
                            <span className="db-player-name">{p.name}</span>
                            <span className="slot-pill" style={{ marginLeft: 4 }}>{p.position}</span>
                            {isAuction && pk.bid_amount != null && (
                              <span className="db-bid">${pk.bid_amount}</span>
                            )}
                          </>
                        ) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ── player pool ─────────────────────────────────────────────── */
  const renderPlayerPool = () => {
    const canPick = (() => {
      if (!draft || draft.status !== 'live') return false;
      if (isAuction) {
        const pickOrder = draft.pick_order || [];
        const nomTeamId = pickOrder[draft.nomination_team_index % pickOrder.length];
        const nomTeam = teamById[nomTeamId];
        return nomTeam?.owner_username === username && !draft.current_nomination;
      } else {
        const info = snakePickInfo(draft.pick_order || [], draft.current_pick_index);
        if (!info) return false;
        const t = teamById[info.teamId];
        return t?.owner_username === username;
      }
    })();

    return (
      <div className="neon-card draft-pool-card">
        <div className="draft-pool-header">
          <span className="gradient-text-cyan" style={{ fontWeight: 700, fontSize: '1rem' }}>
            Available Players {syncing && <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(syncing…)</span>}
          </span>
          <input
            className="draft-search"
            placeholder="Search name / pos / team…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '6px 10px' }} onClick={async () => {
            setSyncing(true);
            try { await fantasyDb.syncPlayerPoolFromEspn(league.sport); } catch {}
            const pl = await fantasyDb.getPlayers(league.sport);
            setPlayers(pl);
            setSyncing(false);
          }}>Sync ESPN</button>
        </div>
        <div className="draft-pool-list">
          {availablePlayers.slice(0, 80).map(p => (
            <div key={p.id} className="draft-pool-row">
              <span className="draft-pool-name">{p.name}</span>
              <span className="slot-pill">{p.position || '—'}</span>
              <span className="draft-pool-abbr">{p.team_abbr || '—'}</span>
              {canPick && (
                isAuction && !draft.current_nomination ? (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                    onClick={() => setNominatePlayerId(p.id)}
                  >
                    Nominate
                  </button>
                ) : !isAuction ? (
                  <button
                    className="neon-button"
                    style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                    onClick={() => handleSnakePick(p)}
                  >
                    Draft
                  </button>
                ) : null
              )}
            </div>
          ))}
          {availablePlayers.length === 0 && (
            <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '20px 0' }}>
              {syncing ? 'Loading players…' : 'No players found. Try syncing from ESPN.'}
            </p>
          )}
        </div>
      </div>
    );
  };

  /* ── snake: on-the-clock banner ──────────────────────────────── */
  const renderSnakeClock = () => {
    if (!draft || draft.status !== 'live' || isAuction) return null;
    const pickOrder = draft.pick_order || [];
    const info = snakePickInfo(pickOrder, draft.current_pick_index);
    if (!info) return null;
    const onClockTeam = teamById[info.teamId];
    const isMyTurn = onClockTeam?.owner_username === username;

    const urgentColor = timerSec <= 10 ? 'var(--color-error)' : timerSec <= 20 ? 'var(--color-warning)' : 'var(--color-cyan)';

    return (
      <div className={`neon-card draft-clock ${isMyTurn ? 'draft-clock-mine' : ''}`}>
        <div className="draft-clock-inner">
          <div>
            <div className="draft-clock-label">On the Clock — Round {info.round}, Pick {info.pickInRound}</div>
            <div className="draft-clock-team">{onClockTeam?.team_name || '—'}</div>
            {isMyTurn && <span className="draft-your-turn-badge">YOUR PICK</span>}
          </div>
          <div className="draft-timer" style={{ color: urgentColor }}>
            {formatSeconds(timerSec)}
          </div>
        </div>
        <div className="progress-bar" style={{ marginTop: 8 }}>
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(100, (timerSec / (draft.seconds_per_pick || 60)) * 100)}%`,
              background: urgentColor === 'var(--color-error)'
                ? 'var(--color-error)'
                : 'linear-gradient(90deg, var(--color-cyan), var(--color-magenta))',
            }}
          />
        </div>
      </div>
    );
  };

  /* ── auction: nomination & bidding UI ────────────────────────── */
  const renderAuctionPanel = () => {
    if (!draft || draft.status !== 'live' || !isAuction) return null;
    const pickOrder = draft.pick_order || [];
    const nomTeamId = pickOrder[draft.nomination_team_index % pickOrder.length];
    const nomTeam = teamById[nomTeamId];
    const isMyNomTurn = nomTeam?.owner_username === username;
    const nom = draft.current_nomination;
    const nomPlayer = nom ? players.find(p => p.id === nom.player_id) : null;
    const urgentColor = auctionTimer <= 10 ? 'var(--color-error)' : auctionTimer <= 20 ? 'var(--color-warning)' : 'var(--color-magenta)';
    const myFaab = myTeam?.faab_balance ?? 0;

    return (
      <div className="neon-card draft-auction-panel">
        {nom ? (
          <>
            <div className="auction-nom-header">
              <div>
                <div className="draft-clock-label">Auction — Bidding Open</div>
                <div className="draft-clock-team">{nomPlayer?.name || nom.player_id}</div>
                <span className="slot-pill">{nomPlayer?.position || '—'}</span>
                <span style={{ marginLeft: 8, color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>{nomPlayer?.team_abbr}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="draft-timer" style={{ color: urgentColor }}>{formatSeconds(auctionTimer)}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>remaining</div>
              </div>
            </div>
            <div className="progress-bar" style={{ margin: '8px 0' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (auctionTimer / (draft.seconds_per_pick || 90)) * 100)}%`,
                  background: urgentColor === 'var(--color-error)' ? 'var(--color-error)' : undefined,
                }}
              />
            </div>
            <div className="auction-bid-status">
              <span>High Bid: <strong style={{ color: 'var(--color-cyan)' }}>${nom.high_bid}</strong></span>
              <span>Leader: <strong style={{ color: 'var(--color-magenta)' }}>{teamById[nom.high_team_id]?.team_name || '—'}</strong></span>
              <span>Your FAAB: <strong>${myFaab}</strong></span>
            </div>
            {myTeam && (
              <div className="auction-bid-row">
                <input
                  type="number"
                  className="draft-bid-input"
                  placeholder={`> $${nom.high_bid}`}
                  value={bidAmount}
                  min={nom.high_bid + 1}
                  max={myFaab}
                  onChange={e => setBidAmount(e.target.value)}
                />
                <button className="neon-button neon-button-magenta" onClick={handleBid} style={{ padding: '8px 18px', fontSize: '0.88rem' }}>
                  Place Bid
                </button>
                {isCommissioner && (
                  <button className="btn-ghost" onClick={() => finalizeAuctionWinner(draft)} style={{ fontSize: '0.82rem' }}>
                    End Bidding
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="draft-clock-label">Auction — Nomination Phase</div>
            <div className="draft-clock-team" style={{ marginBottom: 12 }}>
              {isMyNomTurn ? '🎯 Your turn to nominate a player' : `Waiting for ${nomTeam?.team_name || '—'} to nominate…`}
            </div>
            {isMyNomTurn && (
              <div className="auction-nominate-form">
                <div style={{ marginBottom: 8 }}>
                  <label className="draft-label">Select Player to Nominate</label>
                  <select
                    className="draft-select"
                    value={nominatePlayerId}
                    onChange={e => setNominatePlayerId(e.target.value)}
                  >
                    <option value="">— pick a player —</option>
                    {availablePlayers.slice(0, 100).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.position} – {p.team_abbr})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div>
                    <label className="draft-label">Starting Bid ($)</label>
                    <input
                      type="number"
                      className="draft-bid-input"
                      value={startingBid}
                      min={1}
                      max={myTeam?.faab_balance || 100}
                      onChange={e => setStartingBid(e.target.value)}
                    />
                  </div>
                  <button
                    className="neon-button neon-button-magenta"
                    onClick={handleNominate}
                    disabled={!nominatePlayerId}
                    style={{ padding: '8px 18px', fontSize: '0.88rem', marginTop: 18 }}
                  >
                    Nominate
                  </button>
                </div>
              </div>
            )}
            <div className="auction-faab-row">
              {(teams || []).map(t => (
                <div key={t.id} className="auction-faab-chip">
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{t.team_name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-cyan)' }}>${t.faab_balance}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  /* ── commissioner controls ────────────────────────────────────── */
  const renderCommissionerPanel = () => {
    if (!isCommissioner) return null;
    if (draft?.status === 'live') return null;

    const isPending = !draft || draft.status === 'scheduled';

    return (
      <div className="neon-card draft-comm-panel">
        <h3 className="gradient-text-cyan" style={{ margin: '0 0 12px' }}>
          {draft?.status === 'complete' ? '✅ Draft Complete' : '⚙️ Commissioner Controls'}
        </h3>

        {draft?.status === 'complete' && (
          <p style={{ color: 'var(--color-text-secondary)' }}>The draft has concluded. Head to Rosters to view results.</p>
        )}

        {isPending && (
          <>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginBottom: 12 }}>
              {isAuction ? 'Auction draft' : 'Snake draft'} · {league.sport?.toUpperCase()} ·{' '}
              {teams?.length || 0} teams
            </p>

            {/* Manual pick-order reorder */}
            <div style={{ marginBottom: 14 }}>
              <label className="draft-label">Draft Order (drag or use shuffle)</label>
              {(pickOrderDraft.length > 0 ? pickOrderDraft : (teams || []).map(t => t.id)).map((tid, idx) => (
                <div key={tid} className="pick-order-row">
                  <span className="pick-order-num">{idx + 1}</span>
                  <span className="pick-order-name">{teamById[tid]?.team_name || tid}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn-ghost"
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      disabled={idx === 0}
                      onClick={() => {
                        const arr = pickOrderDraft.length > 0 ? [...pickOrderDraft] : (teams || []).map(t => t.id);
                        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                        setPickOrderDraft(arr);
                      }}
                    >↑</button>
                    <button
                      className="btn-ghost"
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      disabled={idx === (pickOrderDraft.length > 0 ? pickOrderDraft.length : (teams || []).length) - 1}
                      onClick={() => {
                        const arr = pickOrderDraft.length > 0 ? [...pickOrderDraft] : (teams || []).map(t => t.id);
                        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                        setPickOrderDraft(arr);
                      }}
                    >↓</button>
                  </div>
                </div>
              ))}
              <button
                className="btn-ghost"
                style={{ marginTop: 8, fontSize: '0.82rem' }}
                onClick={() => setPickOrderDraft(shuffle((teams || []).map(t => t.id)))}
              >
                🔀 Randomize Order
              </button>
            </div>

            <button className="neon-button" onClick={handleStartDraft} style={{ width: '100%' }}>
              🚀 Start Draft
            </button>
          </>
        )}

        {actionErr && <p className="error-text" style={{ marginTop: 10 }}>{actionErr}</p>}
        {actionMsg && <p style={{ color: 'var(--color-success)', marginTop: 10, fontSize: '0.88rem' }}>{actionMsg}</p>}
      </div>
    );
  };

  /* ── waiting / non-commissioner view ─────────────────────────── */
  const renderWaiting = () => (
    <div className="neon-card" style={{ padding: 28, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
      <h3 className="gradient-text-cyan">Waiting for the commissioner to start the draft…</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
        {isAuction ? 'Auction' : 'Snake'} draft · {league.sport?.toUpperCase()} · {teams?.length || 0} teams
      </p>
    </div>
  );

  /* ── complete view ───────────────────────────────────────────── */
  const renderComplete = () => (
    <div className="neon-card" style={{ padding: 20, marginBottom: 16, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏆</div>
      <h3 className="gradient-text-cyan">Draft Complete!</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
        All {picks.length} picks have been made. The season is now active.
      </p>
    </div>
  );

  /* ── render ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Loading Draft Room…
      </div>
    );
  }

  const isDraftComplete = draft?.status === 'complete';
  const isDraftLive = draft?.status === 'live';
  const isDraftPending = !draft || draft.status === 'scheduled';

  return (
    <div className="draft-room">
      {/* Header */}
      <div className="draft-room-header">
        <h2 className="gradient-text-cyan" style={{ margin: 0 }}>
          {isAuction ? '💰 Auction Draft' : '🐍 Snake Draft'} — {league.name}
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`status-badge status-${isDraftLive ? 'drafting' : isDraftComplete ? 'complete' : 'setup'}`}>
            {isDraftLive ? '● LIVE' : isDraftComplete ? 'COMPLETE' : 'SCHEDULED'}
          </span>
          {myTeam && (
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
              {myTeam.team_name}
              {isAuction && <> · FAAB: <strong style={{ color: 'var(--color-cyan)' }}>${myTeam.faab_balance}</strong></>}
            </span>
          )}
        </div>
      </div>

      {/* Feedback */}
      {actionMsg && <div className="draft-feedback draft-feedback-ok">{actionMsg}</div>}
      {actionErr && <div className="draft-feedback draft-feedback-err">{actionErr}</div>}

      {/* Draft complete banner */}
      {isDraftComplete && renderComplete()}

      {/* Commissioner controls */}
      {renderCommissionerPanel()}

      {/* Waiting state for non-commissioners */}
      {isDraftPending && !isCommissioner && renderWaiting()}

      {/* Live draft UI */}
      {isDraftLive && (
        <div className="draft-live-layout">
          <div className="draft-left-col">
            {/* On-the-clock / auction panel */}
            {isAuction ? renderAuctionPanel() : renderSnakeClock()}

            {/* Player pool */}
            {renderPlayerPool()}
          </div>

          <div className="draft-right-col">
            {/* Picks summary */}
            <div className="neon-card draft-picks-summary">
              <h3 className="gradient-text-cyan" style={{ margin: '0 0 10px' }}>
                Picks ({picks.length})
              </h3>
              <div className="draft-picks-list">
                {[...picks].reverse().slice(0, 30).map(pk => {
                  const p = players.find(x => x.id === pk.player_id);
                  const t = teamById[pk.team_id];
                  return (
                    <div key={pk.id} className="draft-pick-item">
                      <span className="draft-pick-num">#{pk.pick_number}</span>
                      <div className="draft-pick-info">
                        <span className="draft-pick-player">{p?.name || '—'}</span>
                        <span className="draft-pick-team">{t?.team_name || '—'}</span>
                      </div>
                      <span className="slot-pill">{p?.position || '—'}</span>
                      {isAuction && pk.bid_amount != null && (
                        <span style={{ color: 'var(--color-magenta)', fontWeight: 700, fontSize: '0.82rem' }}>${pk.bid_amount}</span>
                      )}
                    </div>
                  );
                })}
                {picks.length === 0 && (
                  <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 16 }}>No picks yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draft board (shown when live or complete and picks exist) */}
      {(isDraftLive || isDraftComplete) && !isAuction && picks.length > 0 && draft && renderDraftBoard()}

      {/* Auction results (complete) */}
      {isDraftComplete && isAuction && picks.length > 0 && (
        <div className="neon-card" style={{ padding: 16, marginTop: 16 }}>
          <h3 className="gradient-text-cyan" style={{ margin: '0 0 12px' }}>Auction Results</h3>
          <table className="roster-table">
            <thead>
              <tr><th>#</th><th>Player</th><th>Pos</th><th>Team</th><th>Bid</th></tr>
            </thead>
            <tbody>
              {picks.sort((a, b) => a.pick_number - b.pick_number).map(pk => {
                const p = players.find(x => x.id === pk.player_id);
                const t = teamById[pk.team_id];
                return (
                  <tr key={pk.id}>
                    <td>{pk.pick_number}</td>
                    <td>{p?.name || '—'}</td>
                    <td><span className="slot-pill">{p?.position || '—'}</span></td>
                    <td>{t?.team_name || '—'}</td>
                    <td style={{ color: 'var(--color-magenta)', fontWeight: 700 }}>${pk.bid_amount ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DraftRoom;
