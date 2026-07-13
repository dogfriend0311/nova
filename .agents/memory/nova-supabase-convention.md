---
name: Nova app Supabase schema convention
description: How new shared/persistent data features should be wired into the Nova app's data layer and Supabase project.
---

The Nova app's `src/services/db.js` is the single data-access layer. Every entity method (get/add/delete) tries Supabase first via `hasSupabase()` + a `supabase.from('nova_<entity>')` call, and silently falls back to a matching localStorage key (e.g. `${league}_<entity>`) if Supabase errors (including "table does not exist"). This means a brand-new feature works immediately in the browser via localStorage even before any DB migration is run.

**Why:** the agent has no Supabase service-role/DB-admin credentials in this environment (only the anon key is configured client-side), so it cannot run `CREATE TABLE` against the user's live project. The app's existing convention already accounts for this by degrading gracefully.

**How to apply:** when adding a feature that needs shared/synced state (e.g. fantasy league rosters, pick'ems picks, awards):
1. Add get/add/delete methods to `db.js` following the existing try-Supabase-then-localStorage-fallback shape.
2. Write a new `supabase/<feature>.sql` migration file (matching the style of `supabase_migration.sql` and `supabase/player_awards.sql`) defining the new `nova_*` table(s) with RLS enabled and a permissive public policy (access control in this app is enforced client-side via role checks, not RLS).
3. Tell the user to run that SQL file once in their Supabase SQL editor to enable cross-device sync; don't block shipping the feature on them doing so.
