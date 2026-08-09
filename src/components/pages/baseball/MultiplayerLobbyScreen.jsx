import React, { useState } from 'react';
import { isLocalMultiplayerSupported } from '../../../services/baseball/netTransport';
import { defaultRelayUrl } from '../../../services/baseball/wsTransport';

function randomRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Host always plays as their own team (whichever side they're viewing
// this matchup from) and picks who the opponent controls on the other
// team before the room is even created — that's what lets the game
// session start immediately with no handshake. The guest just needs
// the room code, the relay URL (online only), and to know which side
// the host told them they're playing.
export default function MultiplayerLobbyScreen({ home, away, mySide, defaultControlledId, onBack, onStart }) {
  const [mode, setMode] = useState(null);
  const [xport, setXport] = useState('local'); // 'local' | 'online'
  const [relayUrl, setRelayUrl] = useState(defaultRelayUrl());
  const [roomCode, setRoomCode] = useState(randomRoomCode());
  const [joinCode, setJoinCode] = useState('');
  const [joinSide, setJoinSide] = useState(mySide === 'home' ? 'away' : 'home');

  const myTeam = mySide === 'home' ? home : away;
  const otherTeam = mySide === 'home' ? away : home;
  const [opponentPlayerId, setOpponentPlayerId] = useState(otherTeam.roster.find(p => !p.isPitcher)?.id || otherTeam.roster[0]?.id);

  const TransportPicker = (
    <div className="dl-field">
      <label className="dl-label">Connection</label>
      <div className="dl-gd-opt-grid">
        <button className={`dl-gd-opt-btn ${xport === 'local' ? 'selected' : ''}`} onClick={() => setXport('local')}>
          Same Device<span className="sub">Two tabs on this device — no setup</span>
        </button>
        <button className={`dl-gd-opt-btn ${xport === 'online' ? 'selected' : ''}`} onClick={() => setXport('online')}>
          Online<span className="sub">A friend on a different device</span>
        </button>
      </div>
      {xport === 'online' && (
        <div className="dl-field" style={{ marginTop: 10 }}>
          <label className="dl-label">Relay Server URL</label>
          <input className="dl-input" value={relayUrl} onChange={(e) => setRelayUrl(e.target.value)} placeholder="wss://your-relay.example.com" />
        </div>
      )}
    </div>
  );

  if (mode === null) {
    return (
      <div className="dl-screen">
        <div className="dl-panel">
          <div className="dl-panel-title">Multiplayer</div>
          {!isLocalMultiplayerSupported() && (
            <p className="dl-gd-note" style={{ marginBottom: 10 }}>Your browser doesn't support same-device play, but online multiplayer will still work.</p>
          )}
          <div className="dl-gd-opt-grid">
            <button className="dl-gd-opt-btn selected" onClick={() => setMode('host')}>Host a Game<span className="sub">Start a room, share the code</span></button>
            <button className="dl-gd-opt-btn" onClick={() => setMode('join')}>Join a Game<span className="sub">Enter a room code from your friend</span></button>
          </div>
          <div className="dl-footer-nav"><button className="dl-back" onClick={onBack}>←</button></div>
        </div>
      </div>
    );
  }

  if (mode === 'host') {
    const canStart = xport === 'local' || (xport === 'online' && relayUrl.trim().length > 0);
    return (
      <div className="dl-screen">
        <div className="dl-panel">
          <div className="dl-panel-title">Hosting — {myTeam.abbr} vs {otherTeam.abbr}</div>
          {TransportPicker}
          <div className="dl-field">
            <label className="dl-label">Opponent Controls ({otherTeam.abbr})</label>
            <select className="dl-select" value={opponentPlayerId} onChange={(e) => setOpponentPlayerId(e.target.value)}>
              {otherTeam.roster.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.position})</option>)}
            </select>
          </div>
          <div style={{ textAlign: 'center', margin: '14px 0 18px' }}>
            <div style={{ fontFamily: "'Teko', sans-serif", fontSize: '3rem', letterSpacing: '0.1em', color: 'var(--dl-amber-bright)' }}>{roomCode}</div>
            <div className="dl-gd-note">
              {xport === 'local'
                ? 'Open Diamond League in another tab and join with this code.'
                : `Share this code with your friend — they'll enter it along with the relay URL above.`}
            </div>
          </div>
          <button
            className="dl-btn dl-btn-primary dl-btn-block"
            disabled={!canStart}
            onClick={() => onStart({
              transport: xport, relayUrl: relayUrl.trim(), roomCode, isHost: true, mySide,
              controlledHomeId: mySide === 'home' ? defaultControlledId : opponentPlayerId,
              controlledAwayId: mySide === 'away' ? defaultControlledId : opponentPlayerId,
            })}
          >
            Start Hosting →
          </button>
          <div className="dl-footer-nav"><button className="dl-back" onClick={() => setMode(null)}>←</button></div>
        </div>
      </div>
    );
  }

  // mode === 'join'
  const canJoin = joinCode.length === 4 && (xport === 'local' || relayUrl.trim().length > 0);
  return (
    <div className="dl-screen">
      <div className="dl-panel">
        <div className="dl-panel-title">Join a Game</div>
        {TransportPicker}
        <div className="dl-field">
          <label className="dl-label">Room Code</label>
          <input className="dl-input" value={joinCode} onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" inputMode="numeric" />
        </div>
        <div className="dl-field">
          <label className="dl-label">Which side did your host say you're playing?</label>
          <div className="dl-gd-opt-grid">
            <button className={`dl-gd-opt-btn ${joinSide === 'home' ? 'selected' : ''}`} onClick={() => setJoinSide('home')}>{home.abbr}<span className="sub">{home.city}</span></button>
            <button className={`dl-gd-opt-btn ${joinSide === 'away' ? 'selected' : ''}`} onClick={() => setJoinSide('away')}>{away.abbr}<span className="sub">{away.city}</span></button>
          </div>
        </div>
        <button
          className="dl-btn dl-btn-primary dl-btn-block"
          disabled={!canJoin}
          onClick={() => onStart({ transport: xport, relayUrl: relayUrl.trim(), roomCode: joinCode, isHost: false, mySide: joinSide })}
        >
          Join Room →
        </button>
        <div className="dl-footer-nav"><button className="dl-back" onClick={() => setMode(null)}>←</button></div>
      </div>
    </div>
  );
}
