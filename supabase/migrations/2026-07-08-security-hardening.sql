-- Migration: security hardening, from the full audit on 2026-07-08.
-- Paste into the Supabase SQL Editor and run once. Safe to re-run.
--
-- Fixes, highest severity first:
--   1. PRIVILEGE ESCALATION. Any signed-in user could make themselves an admin.
--   2. The rate limit could be bypassed by backdating a client timestamp.
--   3. Wall-location edits could be attributed to another climber.
--   4. Reports and wall corrections had no rate limit at all.
--   5. The whole user list, including who the admin is, was readable by anyone.
--   6. The photo bucket accepted files of any size or type, at any path.

-- =========================================================================
-- 1. PRIVILEGE ESCALATION (the important one)
--
-- profiles has a `role` column, and the update policy only checks WHICH ROW
-- you may touch (auth.uid() = id), not WHICH COLUMNS. Postgres has no
-- column-level RLS, and Supabase grants UPDATE on every column to
-- `authenticated` by default. So any signed-in user could run
--     update profiles set role = 'admin' where id = auth.uid()
-- and grant themselves moderation powers over everyone else's contributions.
--
-- The fix is column-level GRANTs, which sit underneath RLS. The client only
-- ever reads (id, display_name, marketing_opt_in) and only ever writes
-- display_name and marketing_opt_in, so nothing in the app breaks. Profile
-- rows are created by the handle_new_user trigger (SECURITY DEFINER), never by
-- the client, so no INSERT grant is needed at all.
-- =========================================================================
revoke select, insert, update, delete on public.profiles from anon, authenticated;
grant select (id, display_name, marketing_opt_in) on public.profiles to anon, authenticated;
grant update (display_name, marketing_opt_in)     on public.profiles to authenticated;

-- =========================================================================
-- 2. RATE LIMIT BYPASS
--
-- recent_contributions() counted created_at, which the CLIENT supplies (it has
-- to: an offline write keeps its real creation time so the feed orders
-- correctly). Anyone could send created_at = last year and never trip the
-- limit. Add a server-stamped column the client cannot influence and count
-- that instead. created_at keeps its display meaning.
-- =========================================================================
alter table public.pins           add column if not exists inserted_at timestamptz not null default now();
alter table public.tracks         add column if not exists inserted_at timestamptz not null default now();
alter table public.notes          add column if not exists inserted_at timestamptz not null default now();
alter table public.photos         add column if not exists inserted_at timestamptz not null default now();
alter table public.ticks          add column if not exists inserted_at timestamptz not null default now();
alter table public.reports        add column if not exists inserted_at timestamptz not null default now();
alter table public.wall_overrides add column if not exists inserted_at timestamptz not null default now();

-- A trigger, not a column grant: this holds no matter what the client sends,
-- and it survives future schema changes.
create or replace function public.stamp_inserted_at()
returns trigger language plpgsql as $fn$
begin
  new.inserted_at := now();
  return new;
end;
$fn$;

do $do$
declare t text;
begin
  foreach t in array array['pins','tracks','notes','photos','ticks','reports','wall_overrides'] loop
    execute format('drop trigger if exists stamp_inserted_at on public.%1$s;', t);
    execute format(
      'create trigger stamp_inserted_at before insert on public.%1$s
         for each row execute function public.stamp_inserted_at();', t);
    execute format('create index if not exists %1$s_inserted_at_idx on public.%1$s (inserted_at);', t);
  end loop;
end $do$;

-- Parameterless, so it can only ever report on the caller. The old version
-- took any uid, which let anyone probe how active another climber had been.
create or replace function public.recent_contributions()
returns bigint language sql stable security definer as $fn$
  select (select count(*) from public.notes          where author_id   = auth.uid() and inserted_at > now() - interval '1 hour')
       + (select count(*) from public.photos         where author_id   = auth.uid() and inserted_at > now() - interval '1 hour')
       + (select count(*) from public.ticks          where author_id   = auth.uid() and inserted_at > now() - interval '1 hour')
       + (select count(*) from public.pins           where author_id   = auth.uid() and inserted_at > now() - interval '1 hour')
       + (select count(*) from public.tracks         where author_id   = auth.uid() and inserted_at > now() - interval '1 hour')
       + (select count(*) from public.wall_overrides where author_id   = auth.uid() and inserted_at > now() - interval '1 hour')
       + (select count(*) from public.reports        where reporter_id = auth.uid() and inserted_at > now() - interval '1 hour');
$fn$;

-- 120/hour rather than 60. The limit now counts server time, so a whole crag
-- day of queued offline beta arrives in one burst; 60 was close enough to a
-- heavy day to risk rejecting real contributions, and a spammer wants
-- thousands, not dozens.
do $do$
declare t text;
begin
  foreach t in array array['pins','tracks','notes','photos','ticks'] loop
    execute format('drop policy if exists "%1$s insert" on public.%1$s;', t);
    execute format(
      'create policy "%1$s insert" on public.%1$s for insert with check (
         auth.uid() = author_id
         and (public.is_admin() or public.recent_contributions() < 120)
       );', t);
  end loop;
end $do$;

-- The old two-argument version is no longer referenced by any policy.
drop function if exists public.recent_contributions(uuid);

-- =========================================================================
-- 3 + 4. WALL CORRECTIONS: attribution spoofing, and no rate limit
--
-- The update policy had no WITH CHECK, so it fell back to the USING clause
-- ("any signed-in user"). That let anyone rewrite any correction AND set
-- author_id to somebody else, so a bad edit would be blamed on another
-- climber. Last-write-wins is still intended; forging the author was not.
-- =========================================================================
drop policy if exists "wall_overrides insert" on public.wall_overrides;
create policy "wall_overrides insert" on public.wall_overrides for insert
  with check (
    auth.uid() = author_id
    and (public.is_admin() or public.recent_contributions() < 120)
  );

drop policy if exists "wall_overrides update" on public.wall_overrides;
create policy "wall_overrides update" on public.wall_overrides for update
  using (auth.role() = 'authenticated')
  with check (auth.uid() = author_id);   -- you may overwrite, but it becomes YOUR edit

drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert
  with check (
    auth.uid() = reporter_id
    and (public.is_admin() or public.recent_contributions() < 120)
  );

-- =========================================================================
-- 5. TEXT SIZE LIMITS
--
-- No column had a length cap, so a single note could be megabytes: real money
-- on a free tier, and it would bloat every offline cache that syncs it. These
-- caps sit far above any genuine climbing note.
-- =========================================================================
alter table public.notes    drop constraint if exists notes_text_len;
alter table public.notes    add  constraint notes_text_len     check (length(text) <= 5000);
alter table public.ticks    drop constraint if exists ticks_note_len;
alter table public.ticks    add  constraint ticks_note_len     check (length(note) <= 2000);
alter table public.pins     drop constraint if exists pins_text_len;
alter table public.pins     add  constraint pins_text_len      check (length(notes) <= 2000 and length(label) <= 120);
alter table public.tracks   drop constraint if exists tracks_text_len;
alter table public.tracks   add  constraint tracks_text_len    check (length(notes) <= 2000 and length(name) <= 120);
alter table public.photos   drop constraint if exists photos_caption_len;
alter table public.photos   add  constraint photos_caption_len check (caption is null or length(caption) <= 300);
alter table public.reports  drop constraint if exists reports_reason_len;
alter table public.reports  add  constraint reports_reason_len check (length(reason) <= 1000);
alter table public.profiles drop constraint if exists profiles_name_len;
alter table public.profiles add  constraint profiles_name_len  check (display_name is null or length(display_name) <= 60);

-- =========================================================================
-- 6. PHOTO BUCKET: size, type, and path
--
-- Any signed-in user could upload a file of any size and any type, to any path
-- in the bucket, including inside another user's folder. The app downscales to
-- JPEG client-side, but that is a courtesy, not enforcement.
-- =========================================================================
update storage.buckets
   set file_size_limit = 5242880,  -- 5 MB; a downscaled photo lands near 200 KB
       allowed_mime_types = array['image/jpeg','image/png','image/webp']
 where id = 'photos';

drop policy if exists "photos bucket insert" on storage.objects;
create policy "photos bucket insert" on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text  -- only your own folder
  );
