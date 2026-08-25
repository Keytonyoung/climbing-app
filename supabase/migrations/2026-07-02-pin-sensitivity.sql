-- Migration: access-sensitivity flag on pins. Some crag access (parking,
-- trailheads) is sensitive. Over-broadcasting it can cause land-manager
-- closures. This lets a contributor mark a pin as sensitive so the app can treat
-- it discreetly (e.g. show a "keep it low-key" note, and later restrict who sees
-- it). Paste into the Supabase SQL Editor and run once. Safe to re-run.

alter table public.pins
  add column if not exists sensitive boolean not null default false;
