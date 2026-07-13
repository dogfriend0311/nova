-- Nova App — Player Comments Migration
-- Run this once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rpdnomdyqgtxhsptnqon/sql/new
--
-- Creates the table backing comments (with optional GIFs) on a league
-- player's stat page. Until this migration is run, the feature still
-- works — it just falls back to per-browser localStorage instead of
-- syncing across devices, matching the rest of the app's data layer.

CREATE TABLE IF NOT EXISTS nova_player_comments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  league        TEXT        NOT NULL,
  player_id     TEXT        NOT NULL,
  player_name   TEXT,
  from_username TEXT        NOT NULL,
  content       TEXT,
  gif_url       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE nova_player_comments ENABLE ROW LEVEL SECURITY;

-- Same public read/write policy pattern used by the app's other nova_* tables:
-- access control is enforced client-side (author or owner/cofounder/mod), not via RLS.
CREATE POLICY "nova_player_comments_public_all" ON nova_player_comments FOR ALL USING (true) WITH CHECK (true);

-- Done! Player comments (with GIFs) will now sync across devices via Supabase.
