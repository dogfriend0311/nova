-- Nova App — Supabase Migration
-- Run this once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rpdnomdyqgtxhsptnqon/sql/new
--
-- This creates a single key/value store table that the app uses
-- to sync all shared data across devices.

CREATE TABLE IF NOT EXISTS app_data (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including signed-out visitors) to read all data
CREATE POLICY "app_data_public_read"
  ON app_data FOR SELECT
  USING (true);

-- Allow the app to write/update data (authenticated via anon key)
CREATE POLICY "app_data_public_insert"
  ON app_data FOR INSERT
  WITH CHECK (true);

CREATE POLICY "app_data_public_update"
  ON app_data FOR UPDATE
  USING (true);

-- Done! The app will automatically start syncing once this table exists.
