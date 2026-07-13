-- Nova App — Player of the Month & Season Accolades Migration
-- Run this once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rpdnomdyqgtxhsptnqon/sql/new
--
-- Creates the tables that back the Player of the Month trophy card and
-- season accolades (Gold Glove, Silver Slugger, MVP, All-Star, etc.)
-- shown on a player's stat page and managed from the Vizta Awards
-- admin tab. Until this migration is run, the feature still works —
-- it just falls back to per-browser localStorage instead of syncing
-- across devices, matching the rest of the app's data layer.

CREATE TABLE IF NOT EXISTS nova_potm_awards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  league      TEXT        NOT NULL,
  player_id   TEXT        NOT NULL,
  player_name TEXT,
  month_label TEXT        NOT NULL,
  note        TEXT,
  awarded_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nova_accolades (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  league       TEXT        NOT NULL,
  player_id    TEXT        NOT NULL,
  player_name  TEXT,
  type         TEXT        NOT NULL,
  season       TEXT        NOT NULL,
  custom_label TEXT,
  awarded_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE nova_potm_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE nova_accolades   ENABLE ROW LEVEL SECURITY;

-- Same public read/write policy pattern used by the app's other nova_* tables:
-- access control is enforced client-side (admin role checks), not via RLS.
CREATE POLICY "nova_potm_awards_public_all" ON nova_potm_awards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "nova_accolades_public_all"   ON nova_accolades   FOR ALL USING (true) WITH CHECK (true);

-- Done! Player of the Month awards and season accolades will now sync
-- across devices via Supabase.
