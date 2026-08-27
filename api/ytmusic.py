# api/ytmusic.py
#
# One serverless function that fronts the real `ytmusicapi` Python package
# (https://github.com/sigma67/ytmusicapi) and exposes it to the React
# frontend as a single JSON endpoint: /api/ytmusic?action=<name>&...
#
# Why one file instead of one function per feature: Vercel bills/boots each
# serverless function independently, and this endpoint is a thin, mostly
# stateless pass-through — a single router keeps the YTMusic() client setup
# (auth, cookies) in one place instead of duplicated across a dozen files.
#
# Auth: browsing/search/exploring/charts work with no login at all (that's
# how ytmusicapi's default, unauthenticated client behaves). Library
# management, playlist creation/editing, play history and uploads need a
# logged-in session, exactly like the Python library does — so those
# actions require one of the two environment variables below to be set on
# the Vercel project:
#
#   YTMUSIC_AUTH_HEADERS   raw request headers copied from a logged-in
#                          browser (see ytmusicapi's "browser" auth setup)
#   YTMUSIC_OAUTH_JSON     an oauth.json produced by `ytmusicapi oauth`
#
# Neither is required for the app to work — search, artist/album/song
# pages, moods/charts, podcasts, and watch playlists all function signed
# out. Actions that need auth return a clear 401 JSON error if neither
# env var is set, instead of crashing.
#
# Local dev: `pip install -r api/requirements.txt` then run this file's
# logic through `vercel dev`, which knows how to boot Python functions.

import json
import os
import tempfile
import base64
import uuid
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from ytmusicapi import YTMusic
from ytmusicapi.exceptions import YTMusicUserError, YTMusicServerError


# ── auth ──────────────────────────────────────────────────────────────
def _build_client():
    """Unauthenticated client for public browsing; authenticated only if
    the project has one of the auth env vars configured."""
    oauth_json = os.environ.get('YTMUSIC_OAUTH_JSON')
    headers = os.environ.get('YTMUSIC_AUTH_HEADERS')
    if oauth_json:
        # YTMusic(auth=...) accepts a raw oauth JSON string directly.
        return YTMusic(auth=oauth_json)
    if headers:
        return YTMusic(auth=headers)
    return YTMusic()


def _require_auth_client():
    client = _build_client()
    if client.auth_type.name == 'UNAUTHORIZED':
        raise AuthRequiredError(
            'This action needs a signed-in YouTube Music session. Set '
            'YTMUSIC_AUTH_HEADERS or YTMUSIC_OAUTH_JSON in the project env.'
        )
    return client


class AuthRequiredError(Exception):
    pass


# ── param coercion helpers (query-string values arrive as strings; JSON
#    POST bodies already carry real types, these are safe no-ops on them) ──
def _s(args, key, default=None):
    v = args.get(key, default)
    return v if v not in (None, '') else default


def _i(args, key, default=None):
    v = args.get(key, None)
    if v is None or v == '':
        return default
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _b(args, key, default=False):
    v = args.get(key, None)
    if v is None:
        return default
    if isinstance(v, bool):
        return v
    return str(v).strip().lower() in ('1', 'true', 'yes', 'on')


def _list(args, key, default=None):
    v = args.get(key, None)
    if v is None:
        return default
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return default
        try:
            parsed = json.loads(v)
            return parsed if isinstance(parsed, list) else [parsed]
        except json.JSONDecodeError:
            # allow a plain comma-separated shorthand for simple id lists
            return [p.strip() for p in v.split(',') if p.strip()]
    return default


def _dict(args, key, default=None):
    v = args.get(key, None)
    if v is None:
        return default
    if isinstance(v, dict):
        return v
    if isinstance(v, str):
        try:
            return json.loads(v)
        except json.JSONDecodeError:
            return default
    return default


# ── action handlers, grouped exactly like the feature list this endpoint
#    was built to cover ───────────────────────────────────────────────
def _browsing_search(ytm, a):
    return ytm.search(
        query=_s(a, 'query') or _s(a, 'q'),
        filter=_s(a, 'filter'),
        scope=_s(a, 'scope'),
        limit=_i(a, 'limit', 20),
        ignore_spelling=_b(a, 'ignore_spelling', False),
    )


def _browsing_search_suggestions(ytm, a):
    return ytm.get_search_suggestions(
        query=_s(a, 'query') or _s(a, 'q'),
        detailed_runs=_b(a, 'detailed_runs', False),
    )


def _browsing_remove_search_suggestions(ytm, a):
    return ytm.remove_search_suggestions(
        suggestions=_list(a, 'suggestions', []),
        indices=_list(a, 'indices'),
    )


def _browsing_get_artist(ytm, a):
    return ytm.get_artist(channelId=_s(a, 'channelId'))


def _browsing_get_artist_albums(ytm, a):
    return ytm.get_artist_albums(
        channelId=_s(a, 'channelId'),
        params=_s(a, 'params'),
        limit=_i(a, 'limit', 100),
        order=_s(a, 'order'),
    )


def _browsing_get_user(ytm, a):
    return ytm.get_user(channelId=_s(a, 'channelId'))


def _browsing_get_user_playlists(ytm, a):
    return ytm.get_user_playlists(channelId=_s(a, 'channelId'), params=_s(a, 'params'))


def _browsing_get_user_videos(ytm, a):
    return ytm.get_user_videos(channelId=_s(a, 'channelId'), params=_s(a, 'params'))


def _browsing_get_album_browse_id(ytm, a):
    return ytm.get_album_browse_id(audioPlaylistId=_s(a, 'audioPlaylistId'))


def _browsing_get_album(ytm, a):
    return ytm.get_album(browseId=_s(a, 'browseId'))


def _browsing_get_song(ytm, a):
    return ytm.get_song(
        videoId=_s(a, 'videoId'),
        signatureTimestamp=_i(a, 'signatureTimestamp'),
    )


def _browsing_get_song_related(ytm, a):
    return ytm.get_song_related(browseId=_s(a, 'browseId'))


def _browsing_get_song_credits(ytm, a):
    return ytm.get_song_credits(browseId=_s(a, 'browseId'))


def _browsing_get_lyrics(ytm, a):
    lyrics = ytm.get_lyrics(browseId=_s(a, 'browseId'), timestamps=_b(a, 'timestamps', False))
    return lyrics.__dict__ if lyrics is not None else None


def _watch_get_watch_playlist(ytm, a):
    return ytm.get_watch_playlist(
        videoId=_s(a, 'videoId'),
        playlistId=_s(a, 'playlistId'),
        limit=_i(a, 'limit', 25),
        radio=_b(a, 'radio', False),
        shuffle=_b(a, 'shuffle', False),
    )


def _explore_get_mood_categories(ytm, a):
    return ytm.get_mood_categories()


def _explore_get_mood_playlists(ytm, a):
    return ytm.get_mood_playlists(params=_s(a, 'params'))


def _charts_get_charts(ytm, a):
    return ytm.get_charts(country=_s(a, 'country', 'ZZ'))


def _library_get_playlists(ytm, a):
    return ytm.get_library_playlists(limit=_i(a, 'limit', 25))


def _library_get_songs(ytm, a):
    return ytm.get_library_songs(
        limit=_i(a, 'limit', 25),
        validate_responses=_b(a, 'validate_responses', False),
        order=_s(a, 'order'),
    )


def _library_get_albums(ytm, a):
    return ytm.get_library_albums(limit=_i(a, 'limit', 25), order=_s(a, 'order'))


def _library_get_artists(ytm, a):
    return ytm.get_library_artists(limit=_i(a, 'limit', 25), order=_s(a, 'order'))


def _library_get_subscriptions(ytm, a):
    return ytm.get_library_subscriptions(limit=_i(a, 'limit', 25), order=_s(a, 'order'))


def _library_get_podcasts(ytm, a):
    return ytm.get_library_podcasts(limit=_i(a, 'limit', 25), order=_s(a, 'order'))


def _library_get_channels(ytm, a):
    return ytm.get_library_channels(limit=_i(a, 'limit', 25), order=_s(a, 'order'))


def _library_get_history(ytm, a):
    return ytm.get_history()


def _library_add_history_item(ytm, a):
    song = _dict(a, 'song', {})
    resp = ytm.add_history_item(song)
    return {'status_code': getattr(resp, 'status_code', None)}


def _library_remove_history_items(ytm, a):
    return ytm.remove_history_items(feedbackTokens=_list(a, 'feedbackTokens', []))


def _library_rate_song(ytm, a):
    return ytm.rate_song(videoId=_s(a, 'videoId'), rating=_s(a, 'rating', 'INDIFFERENT'))


def _library_rate_playlist(ytm, a):
    return ytm.rate_playlist(playlistId=_s(a, 'playlistId'), rating=_s(a, 'rating', 'INDIFFERENT'))


def _library_edit_song_library_status(ytm, a):
    return ytm.edit_song_library_status(feedbackTokens=_list(a, 'feedbackTokens'))


def _library_subscribe_artists(ytm, a):
    ids = _list(a, 'channelIds')
    if ids is None:
        single = _s(a, 'channelId')
        ids = [single] if single else []
    return ytm.subscribe_artists(channelIds=ids)


def _library_unsubscribe_artists(ytm, a):
    ids = _list(a, 'channelIds')
    if ids is None:
        single = _s(a, 'channelId')
        ids = [single] if single else []
    return ytm.unsubscribe_artists(channelIds=ids)


def _library_get_account_info(ytm, a):
    return ytm.get_account_info()


def _playlists_get_playlist(ytm, a):
    return ytm.get_playlist(
        playlistId=_s(a, 'playlistId'),
        limit=_i(a, 'limit', 100),
        related=_b(a, 'related', False),
        suggestions_limit=_i(a, 'suggestions_limit', 0),
    )


def _playlists_get_liked_songs(ytm, a):
    return ytm.get_liked_songs(limit=_i(a, 'limit', 100))


def _playlists_create(ytm, a):
    return ytm.create_playlist(
        title=_s(a, 'title'),
        description=_s(a, 'description', ''),
        privacy_status=_s(a, 'privacy_status', 'PRIVATE'),
        video_ids=_list(a, 'video_ids'),
        source_playlist=_s(a, 'source_playlist'),
    )


def _playlists_join_collaborative(ytm, a):
    return ytm.join_collaborative_playlist(
        playlistId=_s(a, 'playlistId'),
        joinCollaborationToken=_s(a, 'joinCollaborationToken'),
    )


def _playlists_edit(ytm, a):
    move_item = _s(a, 'moveItem')
    move_before = _s(a, 'moveItemBefore')
    if move_item and move_before:
        move_item = (move_item, move_before)
    return ytm.edit_playlist(
        playlistId=_s(a, 'playlistId'),
        title=_s(a, 'title'),
        description=_s(a, 'description'),
        privacyStatus=_s(a, 'privacyStatus'),
        collaboration=a.get('collaboration') if 'collaboration' in a else None,
        moveItem=move_item,
        addPlaylistId=_s(a, 'addPlaylistId'),
        addToTop=a.get('addToTop') if 'addToTop' in a else None,
    )


def _playlists_delete(ytm, a):
    return ytm.delete_playlist(playlistId=_s(a, 'playlistId'))


def _playlists_add_items(ytm, a):
    return ytm.add_playlist_items(
        playlistId=_s(a, 'playlistId'),
        videoIds=_list(a, 'videoIds'),
        source_playlist=_s(a, 'source_playlist'),
        duplicates=_b(a, 'duplicates', False),
    )


def _playlists_remove_items(ytm, a):
    return ytm.remove_playlist_items(playlistId=_s(a, 'playlistId'), videos=_list(a, 'videos', []))


def _podcasts_get_channel(ytm, a):
    return ytm.get_channel(channelId=_s(a, 'channelId'))


def _podcasts_get_channel_episodes(ytm, a):
    return ytm.get_channel_episodes(channelId=_s(a, 'channelId'), params=_s(a, 'params'))


def _podcasts_get_podcast(ytm, a):
    return ytm.get_podcast(playlistId=_s(a, 'playlistId'), limit=_i(a, 'limit', 100))


def _podcasts_get_episode(ytm, a):
    return ytm.get_episode(videoId=_s(a, 'videoId'))


def _podcasts_get_episodes_playlist(ytm, a):
    return ytm.get_episodes_playlist(playlist_id=_s(a, 'playlist_id', 'RDPN'))


def _uploads_get_songs(ytm, a):
    return ytm.get_library_upload_songs(limit=_i(a, 'limit', 25), order=_s(a, 'order'))


def _uploads_get_artists(ytm, a):
    return ytm.get_library_upload_artists(limit=_i(a, 'limit', 25), order=_s(a, 'order'))


def _uploads_get_albums(ytm, a):
    return ytm.get_library_upload_albums(limit=_i(a, 'limit', 25), order=_s(a, 'order'))


def _uploads_get_artist(ytm, a):
    return ytm.get_library_upload_artist(browseId=_s(a, 'browseId'), limit=_i(a, 'limit', 25))


def _uploads_get_album(ytm, a):
    return ytm.get_library_upload_album(browseId=_s(a, 'browseId'))


def _uploads_upload_song(ytm, a):
    # The browser can't hand this endpoint a filesystem path, so it sends
    # the file as base64 in the JSON body; we materialize it in /tmp
    # (the only writable directory in a Vercel function) for the one call
    # ytmusicapi's upload_song() needs a real path for, then clean up.
    filename = _s(a, 'filename', 'upload.mp3')
    data_b64 = _s(a, 'data')
    if not data_b64:
        raise YTMusicUserError('No file data provided (expected base64 in "data").')
    suffix = os.path.splitext(filename)[1] or '.mp3'
    tmp_path = os.path.join(tempfile.gettempdir(), f'{uuid.uuid4().hex}{suffix}')
    try:
        with open(tmp_path, 'wb') as f:
            f.write(base64.b64decode(data_b64))
        result = ytm.upload_song(tmp_path)
        return {'status': str(result) if not hasattr(result, 'status_code') else result.status_code}
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


def _uploads_delete_entity(ytm, a):
    return ytm.delete_upload_entity(entityId=_s(a, 'entityId'))


# actions that work with the public, unauthenticated client
PUBLIC_ACTIONS = {
    'search': _browsing_search,
    'get_search_suggestions': _browsing_search_suggestions,
    'get_artist': _browsing_get_artist,
    'get_artist_albums': _browsing_get_artist_albums,
    'get_user': _browsing_get_user,
    'get_user_playlists': _browsing_get_user_playlists,
    'get_user_videos': _browsing_get_user_videos,
    'get_album_browse_id': _browsing_get_album_browse_id,
    'get_album': _browsing_get_album,
    'get_song': _browsing_get_song,
    'get_song_related': _browsing_get_song_related,
    'get_song_credits': _browsing_get_song_credits,
    'get_lyrics': _browsing_get_lyrics,
    'get_watch_playlist': _watch_get_watch_playlist,
    'get_mood_categories': _explore_get_mood_categories,
    'get_mood_playlists': _explore_get_mood_playlists,
    'get_charts': _charts_get_charts,
    'get_playlist': _playlists_get_playlist,
    'get_channel': _podcasts_get_channel,
    'get_channel_episodes': _podcasts_get_channel_episodes,
    'get_podcast': _podcasts_get_podcast,
    'get_episode': _podcasts_get_episode,
    'get_episodes_playlist': _podcasts_get_episodes_playlist,
}

# actions that require a signed-in session (library, playlist writes,
# history, uploads — anything ytmusicapi itself gates behind auth)
AUTH_ACTIONS = {
    'remove_search_suggestions': _browsing_remove_search_suggestions,
    'get_library_playlists': _library_get_playlists,
    'get_library_songs': _library_get_songs,
    'get_library_albums': _library_get_albums,
    'get_library_artists': _library_get_artists,
    'get_library_subscriptions': _library_get_subscriptions,
    'get_library_podcasts': _library_get_podcasts,
    'get_library_channels': _library_get_channels,
    'get_history': _library_get_history,
    'add_history_item': _library_add_history_item,
    'remove_history_items': _library_remove_history_items,
    'rate_song': _library_rate_song,
    'rate_playlist': _library_rate_playlist,
    'edit_song_library_status': _library_edit_song_library_status,
    'subscribe_artists': _library_subscribe_artists,
    'unsubscribe_artists': _library_unsubscribe_artists,
    'get_account_info': _library_get_account_info,
    'get_liked_songs': _playlists_get_liked_songs,
    'create_playlist': _playlists_create,
    'join_collaborative_playlist': _playlists_join_collaborative,
    'edit_playlist': _playlists_edit,
    'delete_playlist': _playlists_delete,
    'add_playlist_items': _playlists_add_items,
    'remove_playlist_items': _playlists_remove_items,
    'get_library_upload_songs': _uploads_get_songs,
    'get_library_upload_artists': _uploads_get_artists,
    'get_library_upload_albums': _uploads_get_albums,
    'get_library_upload_artist': _uploads_get_artist,
    'get_library_upload_album': _uploads_get_album,
    'upload_song': _uploads_upload_song,
    'delete_upload_entity': _uploads_delete_entity,
}


def dispatch(action, args):
    if not action:
        raise YTMusicUserError('Missing "action" parameter.')
    if action in PUBLIC_ACTIONS:
        return PUBLIC_ACTIONS[action](_build_client(), args)
    if action in AUTH_ACTIONS:
        return AUTH_ACTIONS[action](_require_auth_client(), args)
    raise YTMusicUserError(f'Unknown action "{action}".')


class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _send_json(self, status, payload):
        body = json.dumps(payload, default=str).encode('utf-8')
        self.send_response(status)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        self._handle()

    def do_POST(self):
        self._handle()

    def _handle(self):
        try:
            parsed = urlparse(self.path)
            query = {k: v[0] for k, v in parse_qs(parsed.query).items()}
            body = {}
            if self.command == 'POST':
                length = int(self.headers.get('Content-Length') or 0)
                if length:
                    raw = self.rfile.read(length)
                    if raw:
                        body = json.loads(raw)
            args = {**query, **body}
            action = args.get('action')
            result = dispatch(action, args)
            self._send_json(200, {'ok': True, 'result': result})
        except AuthRequiredError as e:
            self._send_json(401, {'ok': False, 'error': str(e)})
        except YTMusicUserError as e:
            self._send_json(400, {'ok': False, 'error': str(e)})
        except YTMusicServerError as e:
            self._send_json(502, {'ok': False, 'error': str(e)})
        except json.JSONDecodeError:
            self._send_json(400, {'ok': False, 'error': 'Invalid JSON body.'})
        except Exception as e:  # last resort — never leak a raw 500 with no body
            self._send_json(500, {'ok': False, 'error': str(e)})
