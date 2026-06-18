-- Migration: soft-delete + admin revert (the "undoable" half of moderation).
-- Paste this whole file into the Supabase SQL Editor and run it once.
--
-- What it does:
--   1. Adds an admin role (profiles.role) + an is_admin() helper.
--   2. Adds a deleted_at marker to every contributable table (soft delete).
--   3. Rewrites the read rules so soft-deleted rows are HIDDEN from everyone
--      except the admin (who needs to see them to undo).
--   4. Lets the admin set/clear deleted_at on any row (remove + restore).
-- Nothing is ever hard-deleted by the admin path — "remove" just stamps a date,
-- "undo" clears it.

-- =========================================================================
-- 1. Admin role + helper. We key admin off a profiles.role column (not a
--    hardcoded UUID), so the admin id never lands in the repo and adding a
--    second admin later is one UPDATE.  >>> YOU run the UPDATE at the bottom. <<<
-- =========================================================================
alter table public.profiles add column if not exists role text not null default 'user';

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- =========================================================================
-- 2. Soft-delete marker on every contributable table.
-- =========================================================================
alter table public.pins           add column if not exists deleted_at timestamptz;
alter table public.tracks         add column if not exists deleted_at timestamptz;
alter table public.notes          add column if not exists deleted_at timestamptz;
alter table public.photos         add column if not exists deleted_at timestamptz;
alter table public.ticks          add column if not exists deleted_at timestamptz;
alter table public.wall_overrides add column if not exists deleted_at timestamptz;

-- =========================================================================
-- 3. Read rules: hide soft-deleted rows from non-admins. (Drop + recreate the
--    existing "<table> read" policies so this migration is safe to re-run.)
-- =========================================================================
do $$
declare t text;
begin
  foreach t in array array['pins','tracks','notes','photos'] loop
    execute format('drop policy if exists "%1$s read" on public.%1$s;', t);
    execute format(
      'create policy "%1$s read" on public.%1$s for select using (deleted_at is null or public.is_admin());',
      t
    );
  end loop;
end $$;

-- ticks keep their public/own visibility rule, AND hide soft-deleted (admin sees all).
drop policy if exists "ticks read" on public.ticks;
create policy "ticks read" on public.ticks for select using (
  public.is_admin() or ((is_public or auth.uid() = author_id) and deleted_at is null)
);

-- wall_overrides are world-readable; just hide soft-deleted from non-admins.
drop policy if exists "wall_overrides read" on public.wall_overrides;
create policy "wall_overrides read" on public.wall_overrides for select using (
  deleted_at is null or public.is_admin()
);

-- =========================================================================
-- 4. Admin can update any row (to set/clear deleted_at). These are ADDITIONAL
--    permissive policies — they OR with the existing owner-only update rules,
--    so authors still manage their own rows and the admin can moderate all.
--    (wall_overrides already allows any authenticated user to update, so the
--    admin is covered there without a new policy.)
-- =========================================================================
do $$
declare t text;
begin
  foreach t in array array['pins','tracks','notes','photos','ticks'] loop
    execute format('drop policy if exists "%1$s admin update" on public.%1$s;', t);
    execute format(
      'create policy "%1$s admin update" on public.%1$s for update using (public.is_admin()) with check (public.is_admin());',
      t
    );
  end loop;
end $$;

-- =========================================================================
-- 5. >>> RUN THIS LINE YOURSELF, with your own user id <<<
--    Makes you the admin. (Same id that's in .env.local as VITE_ADMIN_USER_ID.)
-- =========================================================================
-- update public.profiles set role = 'admin' where id = 'fb6cd211-c914-48a2-9e4f-be2771d76522';
