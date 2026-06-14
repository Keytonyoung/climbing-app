-- Western Slope Climbing — Supabase schema for multi-user v1.
-- Paste this into the Supabase SQL Editor (see docs/stage-A1-setup.md) to build
-- every table and security rule in one shot. Safe to re-run (idempotent-ish).
--
-- Access model (CLAUDE.md amendment 2026-06-13): anyone may READ; only signed-in
-- users may WRITE; users may edit/delete only their OWN rows. No moderation yet.
-- IDs are generated on the device (crypto.randomUUID) so offline-created rows
-- keep their id when they sync — that's why ids are plain uuid, not defaulted.

-- =========================================================================
-- profiles: one row per signed-in user, for attribution ("who left this").
-- =========================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- pins: parking / trailhead / water / camp / other.
-- =========================================================================
create table if not exists public.pins (
  id         uuid primary key,
  author_id  uuid not null references auth.users (id) on delete cascade,
  category   text not null default 'parking',
  label      text not null default '',
  notes      text not null default '',
  lng        double precision not null,
  lat        double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- tracks: recorded approach trails. Anchors + path stored as jsonb.
-- =========================================================================
create table if not exists public.tracks (
  id           uuid primary key,
  author_id    uuid not null references auth.users (id) on delete cascade,
  name         text not null default '',
  notes        text not null default '',
  start_anchor jsonb,                       -- { kind: 'pin'|'wall', id }
  end_anchor   jsonb,
  coordinates  jsonb not null,              -- [[lng,lat], ...]
  length_m     double precision,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =========================================================================
-- notes: text beta attached to a route or wall. Many per target, each authored
-- (this is the seed of the future comment/social model).
-- =========================================================================
create table if not exists public.notes (
  id          uuid primary key,
  author_id   uuid not null references auth.users (id) on delete cascade,
  target_kind text not null,                -- 'route' | 'wall'
  target_id   text not null,                -- OpenBeta uuid of the route/wall
  text        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists notes_target_idx on public.notes (target_kind, target_id);

-- =========================================================================
-- photos: row references a blob in the 'photos' storage bucket.
-- =========================================================================
create table if not exists public.photos (
  id           uuid primary key,
  author_id    uuid not null references auth.users (id) on delete cascade,
  target_kind  text not null,               -- 'route' | 'wall'
  target_id    text not null,
  storage_path text not null,               -- path within the 'photos' bucket
  created_at   timestamptz not null default now()
);
create index if not exists photos_target_idx on public.photos (target_kind, target_id);

-- =========================================================================
-- Row-Level Security: open read, authenticated write, owner-only edit/delete.
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.pins     enable row level security;
alter table public.tracks   enable row level security;
alter table public.notes    enable row level security;
alter table public.photos   enable row level security;

-- profiles: world-readable; you can insert/update only your own.
create policy "profiles read"   on public.profiles for select using (true);
create policy "profiles insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update" on public.profiles for update using (auth.uid() = id);

-- Reusable owner pattern for the content tables.
do $$
declare t text;
begin
  foreach t in array array['pins','tracks','notes','photos'] loop
    execute format('create policy "%1$s read"   on public.%1$s for select using (true);', t);
    execute format('create policy "%1$s insert" on public.%1$s for insert with check (auth.uid() = author_id);', t);
    execute format('create policy "%1$s update" on public.%1$s for update using (auth.uid() = author_id);', t);
    execute format('create policy "%1$s delete" on public.%1$s for delete using (auth.uid() = author_id);', t);
  end loop;
end $$;

-- =========================================================================
-- wall_overrides: corrected coordinates for OpenBeta walls (the seed data is
-- read-only, so fixes live here, overlaid at render time). One row per wall;
-- any signed-in user may set/replace it (last-write-wins, attributed). Reset =
-- delete the row. (Hardening — consensus/locking — is a turning-point task.)
-- =========================================================================
create table if not exists public.wall_overrides (
  wall_id    text primary key,         -- OpenBeta wall uuid
  lng        double precision not null,
  lat        double precision not null,
  author_id  uuid not null references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.wall_overrides enable row level security;
create policy "wall_overrides read"   on public.wall_overrides for select using (true);
create policy "wall_overrides insert" on public.wall_overrides for insert
  with check (auth.role() = 'authenticated' and auth.uid() = author_id);
-- Any signed-in user may overwrite anyone's correction (last-write-wins).
create policy "wall_overrides update" on public.wall_overrides for update
  using (auth.role() = 'authenticated');
create policy "wall_overrides delete" on public.wall_overrides for delete
  using (auth.role() = 'authenticated');

-- =========================================================================
-- Storage bucket for photos (public read). If the bucket already exists this
-- is a no-op. Object-level write rules are added in the runbook via the
-- dashboard, or uncomment the policies below.
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Authenticated users can upload; anyone can read; owners manage their files.
create policy "photos bucket read"   on storage.objects for select using (bucket_id = 'photos');
create policy "photos bucket insert" on storage.objects for insert
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "photos bucket delete" on storage.objects for delete
  using (bucket_id = 'photos' and auth.uid() = owner);
