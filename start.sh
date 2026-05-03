#!/bin/bash
# Write Replit secrets to .env.local so CRA embeds them at build time.
# This ensures every visitor gets the keys baked into their bundle.

ENV_FILE=".env.local"
> "$ENV_FILE"

[ -n "$REACT_APP_LASTFM_KEY" ] && echo "REACT_APP_LASTFM_KEY=$(echo "$REACT_APP_LASTFM_KEY" | tr -d '[:space:]')" >> "$ENV_FILE"
[ -n "$REACT_APP_OMDB_KEY"   ] && echo "REACT_APP_OMDB_KEY=$(echo "$REACT_APP_OMDB_KEY" | tr -d '[:space:]')"     >> "$ENV_FILE"

echo ".env.local written:"
grep -o '^[^=]*' "$ENV_FILE"

exec npm start
