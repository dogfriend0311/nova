// src/components/pages/music/MusicLeaderboard.jsx
//
// "Most listened to" leaderboards for the Music Hub — top songs, top
// listeners, top artists, and top genres — built from
// nova_music_plays (one row per play, logged from the global
// mini-player and the karaoke/fireworks visualizer — see
// db.recordMusicPlay). Plain aggregation client-side, same pattern as
// AllTimeLeaderboard.jsx elsewhere in the app.
//
// Genre is the one exception: Nova Music (YT Music search) never
// returns a genre for an individual track, so "Top Genre" is built
// from nova_song_genres — an owner-tagged video_id -> genre map (see
// Owner Dashboard -> Song Genres) — rather than pretending there's a
// real genre signal in the play data. Untagged plays show under
// "Untagged" instead of being dropped.
import React, { useEffect, useState } from 'react';
import db from '../../../services/db';

const th = { textAlign: 'left', padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(158,165,196,0.45)', borderBottom: '1px solid rgba(94,129,244,0.12)' };
const td = { padding: '9px 10px', fontSize: '0.85rem', color: '#e2e5f0', borderBottom: '1px solid rgba(94,129,244,0.06)' };

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

function RankCell({ rank }) {
  return <td style={{ ...td, fontWeight: 800, color: rank <= 3 ? 'var(--color-cyan)' : 'rgba(158,165,196,0.55)' }}>{RANK_MEDAL[rank - 1] || rank}</td>;
}

const MODES = [
  { id: 'songs', label: '🎵 Top Songs' },
  { id: 'listeners', label: '🧑‍🎤 Top Listeners' },
  { id: 'artists', label: '🎤 Top Artists' },
  { id: 'genres', label: '🎧 Top Genres' },
];

const MusicLeaderboard = () => {
  const [mode, setMode] = useState('songs');
  const [songs, setSongs] = useState(null);
  const [listeners, setListeners] = useState(null);
  const [artists, setArtists] = useState(null);
  const [genres, setGenres] = useState(null);

  useEffect(() => {
    db.getTopSongs(15).then(setSongs).catch(() => setSongs([]));
    db.getTopListeners(15).then(setListeners).catch(() => setListeners([]));
    db.getTopArtists(15).then(setArtists).catch(() => setArtists([]));
    db.getTopGenres(15).then(setGenres).catch(() => setGenres([]));
  }, []);

  const rows = { songs, listeners, artists, genres }[mode];

  return (
    <div>
      <div className="ytm-list-sub" style={{ marginBottom: 16 }}>
        Ranked by plays across Nova Music search and the karaoke/fireworks visualizer.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700,
            background: mode === m.id ? 'rgba(94,129,244,0.15)' : 'rgba(94,129,244,0.04)',
            border: `1px solid ${mode === m.id ? 'rgba(94,129,244,0.5)' : 'rgba(94,129,244,0.15)'}`,
            color: mode === m.id ? 'var(--color-cyan)' : 'rgba(158,165,196,0.55)',
          }}>{m.label}</button>
        ))}
      </div>

      {rows === null ? (
        <div style={{ color: 'rgba(158,165,196,0.4)', padding: 20 }}>Loading leaderboard…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: 'rgba(158,165,196,0.35)', padding: 20 }}>
          {mode === 'genres'
            ? 'No genres tagged yet — an owner or co-owner can tag songs from Owner Dashboard → Song Genres.'
            : `No plays logged yet — ${mode} will show up here once people start listening in Nova Music.`}
        </div>
      ) : mode === 'songs' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}></th>
                <th style={th}>Song</th>
                <th style={th}>Plays</th>
                <th style={th}>Listeners</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.video_id}>
                  <RankCell rank={i + 1} />
                  <td style={{ ...td, width: 44 }}>
                    {r.thumbnail
                      ? <img src={r.thumbnail} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 4, background: 'rgba(94,129,244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>♪</div>}
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{r.title}</div>
                    {r.artist && <div style={{ fontSize: '0.76rem', color: 'rgba(158,165,196,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{r.artist}</div>}
                  </td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.plays}</td>
                  <td style={td}>{r.listeners}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : mode === 'listeners' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Member</th>
                <th style={th}>Plays</th>
                <th style={th}>Unique Songs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.username}>
                  <RankCell rank={i + 1} />
                  <td style={{ ...td, fontWeight: 700 }}>{r.username}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.plays}</td>
                  <td style={td}>{r.songs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : mode === 'artists' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Artist</th>
                <th style={th}>Plays</th>
                <th style={th}>Unique Songs</th>
                <th style={th}>Listeners</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.artist}>
                  <RankCell rank={i + 1} />
                  <td style={{ ...td, fontWeight: 700 }}>{r.artist}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.plays}</td>
                  <td style={td}>{r.songs}</td>
                  <td style={td}>{r.listeners}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Genre</th>
                <th style={th}>Plays</th>
                <th style={th}>Unique Songs</th>
                <th style={th}>Listeners</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.genre}>
                  <RankCell rank={i + 1} />
                  <td style={{ ...td, fontWeight: 700, fontStyle: r.genre === 'Untagged' ? 'italic' : 'normal', opacity: r.genre === 'Untagged' ? 0.6 : 1 }}>{r.genre}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.plays}</td>
                  <td style={td}>{r.songs}</td>
                  <td style={td}>{r.listeners}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MusicLeaderboard;
