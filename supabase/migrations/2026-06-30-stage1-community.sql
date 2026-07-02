-- Migration: Stage 1 community groundwork — trust tiers, marketing opt-in, reports.
-- Paste into the Supabase SQL Editor and run once. Safe to re-run.
-- Pairs with code that lands after this runs (report button, opt-in checkbox);
-- until then these columns/tables are simply unused.

-- =========================================================================
-- 1. Trust tier on profiles. Designed now so gating high-risk edits later is a
--    filter, not a schema change. 'trusted' is the default so nothing changes
--    for the current group; new/unknown accounts can be dropped to 'new' when
--    open sign-up brings strangers, and moderation can promote/demote.
-- =========================================================================
alter table public.profiles
  add column if not exists trust text not null default 'trusted';  -- 'new' | 'trusted' | 'admin-ish'

-- =========================================================================
-- 2. Marketing opt-in (separate from the transactional auth email). Unchecked by
--    default — we only email updates to people who explicitly say yes.
-- =========================================================================
alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false;

-- =========================================================================
-- 3. Reports: users flag bad/unsafe/spam content so moderation can act. Points
--    at any contributable target by kind + id (same pattern as notes/photos).
-- =========================================================================
create table if not exists public.reports (
  id           uuid primary key,
  reporter_id  uuid not null references auth.users (id) on delete cascade,
  target_kind  text not null,      -- 'note' | 'photo' | 'pin' | 'track' | 'tick' | 'wall' | 'route'
  target_id    text not null,
  reason       text not null default '',
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz         -- set when an admin has dealt with it
);
create index if not exists reports_open_idx on public.reports (resolved_at) where resolved_at is null;

alter table public.reports enable row level security;
-- Signed-in users file reports as themselves; they can see their own.
create policy "reports insert" on public.reports for insert
  with check (auth.uid() = reporter_id);
create policy "reports read own" on public.reports for select
  using (auth.uid() = reporter_id or public.is_admin());
-- Only admins resolve/curate reports.
create policy "reports admin update" on public.reports for update
  using (public.is_admin()) with check (public.is_admin());
