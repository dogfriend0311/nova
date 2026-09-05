// src/components/pages/music/PlaylistsTab.jsx
//
// The Music Hub's "Playlists" tab.
//
//   - Owner/co-owner build one (or more) "Official" playlists together —
//     only they can add/remove/reorder songs in it — and it's pinned to
//     the top of the Playlists tab for every member to see.
//   - Any member can search Nova Music and, with one tap, add a song to a
//     brand-new playlist or an existing one of their own.
//   - Inside a playlist: reorder songs (move up/down), play the whole
//     thing, shuffle, skip, and go back — powered by the app-wide "now
//     playing" queue (see NowPlayingContext) so it keeps playing across
//     page navigation just like everything else in Nova Music.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ytm from '../../../services/ytMusicService';
import playlistService, { canEditPlaylist, isOwnerOrCofounder } from '../../../services/playlistService';
import { useNowPlaying } from '../../../context/NowPlayingContext';
import '../NovaFeatures.css';
import './ytmusic.css';
import './playlists.css';

const thumbUrl = (thumbnails) => {
  if (!Array.isArray(thumbnails) || !thumbnails.length) return null;
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || null;
};
const artistNames = (artists) =>
  Array.isArray(artists) ? artists.filter((a) => a?.name).map((a) => a.name).join(', ') : '';

function Thumb({ src, size = 44 }) {
  return src
    ? <img className="pl-thumb" src={src} alt="" style={{ width: size, height: size }} />
    : <div className="pl-thumb pl-thumb-empty" style={{ width: size, height: size }}>♪</div>;
}

// ── Search + "add to playlist" ───────────────────────────────────────
function SongSearch({ user, playlists, onAdded, onCreateAndAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuFor, setMenuFor] = useState(null); // videoId of the song whose "add to" menu is open
  const [newName, setNewName] = useState('');

  const runSearch = useCallback((q) => {
    if (!q.trim()) return;
    setLoading(true); setError(null);
    ytm.search(q, { filter: 'songs', limit: 20 })
      .then((r) => setResults(r || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const closeMenu = () => { setMenuFor(null); setNewName(''); };

  const addExisting = (song, playlistId) => {
    onAdded(playlistId, song);
    closeMenu();
  };

  const addNew = (song, isFeatured) => {
    const name = newName.trim();
    if (!name) return;
    onCreateAndAdd(name, isFeatured, song);
    closeMenu();
  };

  const allEditable = playlists.filter((p) => canEditPlaylist(p, user));

  return (
    <div className="nf-card">
      <div className="ytm-row">
        <input
          className="ytm-input" style={{ flex: '1 1 220px' }}
          placeholder="Search a song to add to a playlist…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
        />
        <button className="ytm-btn" onClick={() => runSearch(query)} disabled={!query.trim()}>Search</button>
      </div>

      {loading && <div className="ytm-loading">Searching…</div>}
      {error && <div className="ytm-error">{error}</div>}
      {results && results.length === 0 && <div className="ytm-empty">No songs found.</div>}

      {results && results.length > 0 && (
        <div className="ytm-list" style={{ marginTop: 12 }}>
          {results.map((s, i) => {
            const song = {
              videoId: s.videoId, title: s.title,
              artist: artistNames(s.artists), thumbnail: thumbUrl(s.thumbnails), duration: s.duration,
            };
            const open = menuFor === song.videoId;
            return (
              <div key={song.videoId || i} className="pl-search-row">
                <Thumb src={song.thumbnail} />
                <div className="ytm-list-main">
                  <div className="ytm-list-title">{song.title}</div>
                  <div className="ytm-list-sub">{song.artist}</div>
                </div>
                <div className="pl-add-wrap">
                  <button className="ytm-btn small" onClick={() => setMenuFor(open ? null : song.videoId)}>
                    + Add to Playlist
                  </button>
                  {open && (
                    <div className="pl-add-menu">
                      {allEditable.length === 0 && (
                        <div className="pl-add-menu-empty">You don't have any playlists yet.</div>
                      )}
                      {allEditable.map((p) => (
                        <button key={p.id} className="pl-add-menu-item" onClick={() => addExisting(song, p.id)}>
                          {p.is_featured ? '📌 ' : ''}{p.name}
                        </button>
                      ))}
                      <div className="pl-add-menu-divider" />
                      <div className="pl-add-menu-new">
                        <input
                          className="ytm-input" placeholder="New playlist name…"
                          value={newName} onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addNew(song, false)}
                        />
                        <button className="ytm-btn small" disabled={!newName.trim()} onClick={() => addNew(song, false)}>
                          Create
                        </button>
                      </div>
                      {isOwnerOrCofounder(user) && (
                        <button
                          className="pl-add-menu-item pl-add-menu-official"
                          disabled={!newName.trim()}
                          onClick={() => addNew(song, true)}
                        >
                          📌 Create as Official playlist
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── A playlist card in the grid ──────────────────────────────────────
function PlaylistCard({ playlist, songCount, onOpen }) {
  return (
    <div className="pl-card" onClick={onOpen}>
      {playlist.cover_thumbnail
        ? <img className="pl-card-thumb" src={playlist.cover_thumbnail} alt="" />
        : <div className="pl-card-thumb pl-card-thumb-empty">♪</div>}
      <div className="pl-card-title">
        {playlist.is_featured && <span className="pl-pin" title="Official playlist — pinned for everyone">📌</span>}
        {playlist.name}
      </div>
      <div className="pl-card-sub">
        {songCount} song{songCount === 1 ? '' : 's'} · {playlist.is_featured ? 'Official' : `by ${playlist.created_by}`}
      </div>
    </div>
  );
}

// ── One song row inside a playlist ───────────────────────────────────
function SongRow({ song, index, total, isCurrent, isPlaying, canEdit, onPlay, onRemove, onMoveUp, onMoveDown }) {
  return (
    <div className={`pl-song-row ${isCurrent ? 'active' : ''}`}>
      <div className="pl-song-index">{isCurrent ? (isPlaying ? '▶' : '❚❚') : index + 1}</div>
      <Thumb src={song.thumbnail} size={40} />
      <div className="ytm-list-main">
        <div className="ytm-list-title">{song.title}</div>
        <div className="ytm-list-sub">{song.artist}</div>
      </div>
      <div className="pl-song-actions">
        <button className="ytm-play-btn" title="Play" onClick={onPlay}>▶</button>
        {canEdit && (
          <>
            <button className="ytm-btn small ghost" title="Move up" disabled={index === 0} onClick={onMoveUp}>↑</button>
            <button className="ytm-btn small ghost" title="Move down" disabled={index === total - 1} onClick={onMoveDown}>↓</button>
            <button className="ytm-btn small danger" title="Remove" onClick={onRemove}>✕</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Playlist detail view ─────────────────────────────────────────────
function PlaylistDetail({ playlist, user, onBack, onDeleted, onChanged }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(playlist.name);
  const { current, isPlaying, playQueue, queueName } = useNowPlaying();

  const canEdit = canEditPlaylist(playlist, user);

  const load = useCallback(() => {
    setLoading(true);
    playlistService.getSongs(playlist.id).then(setSongs).finally(() => setLoading(false));
  }, [playlist.id]);

  useEffect(() => { load(); }, [load]);

  const toTrack = (s) => ({ videoId: s.video_id, title: s.title, subtitle: s.artist, thumbnail: s.thumbnail, kind: 'song' });

  const playFrom = (index, shuffle = false) => {
    playQueue(songs.map(toTrack), index, { name: playlist.name, shuffle });
  };

  const move = async (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= songs.length) return;
    const ids = songs.map((s) => s.id);
    const swapped = playlistService.moveSong(ids, index, j);
    setSongs(swapped.map((id) => songs.find((s) => s.id === id)));
    await playlistService.reorder(playlist.id, swapped);
  };

  const remove = async (songId) => {
    setSongs((cur) => cur.filter((s) => s.id !== songId));
    await playlistService.removeSong(songId, playlist.id);
  };

  const saveRename = async () => {
    const name = nameDraft.trim();
    if (name && name !== playlist.name) await playlistService.renamePlaylist(playlist.id, name);
    setRenaming(false);
    onChanged();
  };

  const deletePlaylist = async () => {
    if (!window.confirm(`Delete "${playlist.name}"? This can't be undone.`)) return;
    await playlistService.deletePlaylist(playlist.id);
    onDeleted();
  };

  return (
    <div>
      <button className="ytm-btn ghost ytm-back" onClick={onBack}>← All Playlists</button>

      <div className="ytm-detail-header">
        {playlist.cover_thumbnail
          ? <img className="ytm-detail-thumb" src={playlist.cover_thumbnail} alt="" />
          : <div className="ytm-detail-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>♪</div>}
        <div style={{ flex: 1, minWidth: 200 }}>
          {renaming ? (
            <div className="ytm-row">
              <input className="ytm-input" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveRename()} autoFocus />
              <button className="ytm-btn small" onClick={saveRename}>Save</button>
              <button className="ytm-btn small ghost" onClick={() => { setRenaming(false); setNameDraft(playlist.name); }}>Cancel</button>
            </div>
          ) : (
            <div className="ytm-detail-title">
              {playlist.is_featured && <span className="pl-pin" title="Official playlist — pinned for everyone">📌</span>}
              {playlist.name}
            </div>
          )}
          <div className="ytm-detail-sub">
            {songs.length} song{songs.length === 1 ? '' : 's'} · {playlist.is_featured ? 'Official — maintained by the owner & co-owner' : `by ${playlist.created_by}`}
          </div>
          <div className="ytm-row" style={{ marginTop: 10 }}>
            <button className="ytm-btn" disabled={!songs.length} onClick={() => playFrom(0)}>▶ Play All</button>
            <button className="ytm-btn ghost" disabled={!songs.length} onClick={() => playFrom(0, true)}>🔀 Shuffle Play</button>
            {canEdit && !renaming && <button className="ytm-btn ghost small" onClick={() => setRenaming(true)}>Rename</button>}
            {canEdit && <button className="ytm-btn danger small" onClick={deletePlaylist}>Delete Playlist</button>}
          </div>
        </div>
      </div>

      {loading && <div className="ytm-loading">Loading songs…</div>}
      {!loading && songs.length === 0 && (
        <div className="ytm-empty">No songs yet — search above and add some.</div>
      )}
      {!loading && songs.length > 0 && (
        <div className="ytm-list" style={{ marginTop: 12 }}>
          {songs.map((s, i) => (
            <SongRow
              key={s.id} song={s} index={i} total={songs.length}
              isCurrent={current?.videoId === s.video_id && queueName === playlist.name}
              isPlaying={isPlaying}
              canEdit={canEdit}
              onPlay={() => playFrom(i)}
              onRemove={() => remove(s.id)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────
export default function PlaylistsTab({ user }) {
  const [playlists, setPlaylists] = useState({ featured: [], mine: [] });
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [songCounts, setSongCounts] = useState({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const isGuest = !user || user.role === 'guest';

  const load = useCallback(() => {
    setLoading(true);
    // Pinned/official playlists are visible to everyone, even signed-out
    // visitors — only "My Playlists" (and the ability to add songs)
    // requires being logged in.
    playlistService.getPlaylistsForUser(isGuest ? null : user.username).then(async (result) => {
      setPlaylists(result);
      const all = [...result.featured, ...result.mine];
      const counts = {};
      await Promise.all(all.map(async (p) => { counts[p.id] = (await playlistService.getSongs(p.id)).length; }));
      setSongCounts(counts);
    }).finally(() => setLoading(false));
  }, [user, isGuest]);

  useEffect(() => { load(); }, [load]);

  const allPlaylists = useMemo(() => [...playlists.featured, ...playlists.mine], [playlists]);
  const activePlaylist = allPlaylists.find((p) => p.id === activeId) || null;

  const handleAdded = async (playlistId, song) => {
    await playlistService.addSong(playlistId, song, user.username);
    load();
  };

  const handleCreateAndAdd = async (name, isFeatured, song) => {
    const p = await playlistService.createPlaylist({ name, createdBy: user.username, isFeatured });
    await playlistService.addSong(p.id, song, user.username);
    load();
  };

  const createEmpty = async (isFeatured) => {
    const name = newName.trim();
    if (!name) return;
    await playlistService.createPlaylist({ name, createdBy: user.username, isFeatured });
    setNewName('');
    setCreating(false);
    load();
  };

  if (activePlaylist) {
    return (
      <div className="nf-page">
        <PlaylistDetail
          playlist={activePlaylist}
          user={user}
          onBack={() => setActiveId(null)}
          onDeleted={() => { setActiveId(null); load(); }}
          onChanged={load}
        />
      </div>
    );
  }

  return (
    <div className="nf-page">
      <div className="nf-header">
        <h1>🎵 Playlists</h1>
        <p>Search a song, add it to a playlist, then play it your way</p>
      </div>

      {isGuest
        ? <div className="nf-card">Log in to search songs and build your own playlists.</div>
        : <SongSearch user={user} playlists={allPlaylists} onAdded={handleAdded} onCreateAndAdd={handleCreateAndAdd} />}

      {loading && <div className="nf-card nf-empty">Loading playlists…</div>}

      {!loading && playlists.featured.length > 0 && (
        <>
          <div className="pl-section-title">📌 Pinned</div>
          <div className="pl-grid">
            {playlists.featured.map((p) => (
              <PlaylistCard key={p.id} playlist={p} songCount={songCounts[p.id] ?? 0} onOpen={() => setActiveId(p.id)} />
            ))}
          </div>
        </>
      )}

      {!loading && !isGuest && (
        <>
          <div className="pl-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>My Playlists</span>
            {!creating && <button className="ytm-btn small" onClick={() => setCreating(true)}>+ New Playlist</button>}
          </div>

          {creating && (
            <div className="nf-card" style={{ marginBottom: 12 }}>
              <div className="ytm-row">
                <input className="ytm-input" style={{ flex: '1 1 200px' }} placeholder="Playlist name…"
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createEmpty(false)} autoFocus />
                <button className="ytm-btn small" disabled={!newName.trim()} onClick={() => createEmpty(false)}>Create</button>
                {isOwnerOrCofounder(user) && (
                  <button className="ytm-btn small ghost" disabled={!newName.trim()} onClick={() => createEmpty(true)}>
                    Create as Official 📌
                  </button>
                )}
                <button className="ytm-btn small ghost" onClick={() => { setCreating(false); setNewName(''); }}>Cancel</button>
              </div>
            </div>
          )}

          {playlists.mine.length === 0
            ? <div className="ytm-empty">You haven't made a playlist yet — search a song above to start one.</div>
            : (
              <div className="pl-grid">
                {playlists.mine.map((p) => (
                  <PlaylistCard key={p.id} playlist={p} songCount={songCounts[p.id] ?? 0} onOpen={() => setActiveId(p.id)} />
                ))}
              </div>
            )}
        </>
      )}
    </div>
  );
}
