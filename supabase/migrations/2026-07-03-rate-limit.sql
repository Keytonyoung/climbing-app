-- Migration: contribution rate limiting (the preventive half of anti-abuse).
-- Paste into the Supabase SQL Editor and run once. Safe to re-run.
--
-- Rule: a non-admin user may create at most 60 contributions per rolling hour,
-- summed across notes/photos/ticks/pins/tracks. Generous for any human climber
-- (even a big beta-entry session), a wall for spam floods. Enforced in the
-- DATABASE (insert policies), because client-side throttles are decoration.
--
-- Offline note: queued offline writes carry their original client timestamps,
-- so a big sync after a crag day spreads across hours and won't trip the limit.

create or replace function public.recent_contributions(uid uuid)
returns bigint language sql stable security definer as $$
  select (select count(*) from public.notes  where author_id = uid and created_at > now() - interval '1 hour')
       + (select count(*) from public.photos where author_id = uid and created_at > now() - interval '1 hour')
       + (select count(*) from public.ticks  where author_id = uid and created_at > now() - interval '1 hour')
       + (select count(*) from public.pins   where author_id = uid and created_at > now() - interval '1 hour')
       + (select count(*) from public.tracks where author_id = uid and created_at > now() - interval '1 hour');
$$;

do $$
declare t text;
begin
  foreach t in array array['pins','tracks','notes','photos','ticks'] loop
    execute format('drop policy if exists "%1$s insert" on public.%1$s;', t);
    execute format(
      'create policy "%1$s insert" on public.%1$s for insert with check (
         auth.uid() = author_id
         and (public.is_admin() or public.recent_contributions(auth.uid()) < 60)
       );',
      t
    );
  end loop;
end $$;
