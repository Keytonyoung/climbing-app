# Western Slope Climbing — v1 Multi-User Plan

**Status:** active plan as of 2026-06-13. Target: functional shared v1 by **2026-06-20**.
This document guides all sessions until v1 is done. If a change conflicts with it, flag
the conflict before proceeding (same rule as CLAUDE.md).

---

## 0. Deviation from the original brief (flagged)

CLAUDE.md §2 lists "user accounts, social features, or a backend" as **NON-goals until
traction demands it**, and §7 gated a backend on *strangers* using the app. We are
**consciously bringing the backend forward to the friend-group stage** because Cole's
priority milestone is now sharing beta with climbing buddies. This is a deliberate
product-owner decision, not scope creep. **Action:** amend CLAUDE.md §2/§7 to reflect this
once confirmed.

---

## #1 POST-LAUNCH FEATURE — Strava-style climb logging + activity feed

Decided 2026-06-13 (Cole's idea, refined). The marquee feature *after* friends are
using the core app — evidence-gated and benefits from seeing real usage first.
- **Log an ascent** on a route: date, style (onsight/flash/redpoint/repeat/TR), optional
  note + felt-grade, and a **public/private toggle**.
- **`ticks` (ascents) table**: id, author_id, route_id, wall_id, date, style, note,
  felt_grade, is_public, created_at. RLS: read public-or-own, write own.
- **Activity feed**: friends' recent public logs ("Cole sent Sisyphus 5.11d 🔴 yesterday")
  — the social/engagement loop. Your own **logbook** view too.
- This generates content automatically, creates the social pull, and is the literal
  "platforms are built by the people on them" mechanism. Reuses the data-layer + offline
  sync patterns. **NOT in-app chat** — that's redundant with texting + the share link.

## 1. The vision we are building toward

Trajectory (each step gated by real evidence, not built on spec):

1. **Solo PWA** — done (pins, trails, notes, photos, all local).
2. **Trusted friend-group sharing** ← THE MILESTONE we build now. Cole records a route's
   trail + photos + notes; invited buddies open the app and see it. "I did this yesterday,
   go check it out."
3. **Organic growth** — buddies contribute their own beta; their data is how it scales.
   "Platforms are built by the people on them."
4. **Turning point** — if lots of people use it, *then* decide on the full-scale buildout.

**End-goal to build toward (NOT build yet):** a social, interactive platform. Notes/comments
tied to a route, time-ordered, by identified authors — e.g. 6/13 "gear stuck on this route",
6/15 "I pulled it down, it's at the trailhead." This is why identity + a relational/realtime
backend matter now even though the social UI comes later.

---

## 2. Locked decisions

- **Backend: Supabase** (managed Postgres + Auth + Storage + Realtime; PostGIS available).
  Chosen because the relational model fits the social end-goal (comment threads = rows with
  author/target/timestamp/parent_id), Realtime gives the live "social" feel, it has the
  offline-sync ecosystem (PowerSync/Electric), and data exports cleanly ("never trapped").
- **The data-layer (rule #2) is the swap point.** UI never touches storage directly, so
  going multi-user rewires `src/data/*.js` — not a rewrite.
- **Access model:** reading is **open via link**; **contributing requires identity.** No
  anonymous edit (attribution is foundational to the social goal + prevents link-leak abuse).
- **Onboarding:** **messageable invite links** — Cole texts a link, buddy taps it, does a
  one-tap identity step (magic-link / OTP), they're in.
- **Sharing scope:** everything you add is shared with the group (no private/public toggle
  in v1).
- **Moderation:** deferred to the turning point. A trusted group needs none; access control
  (invited-only writes) replaces it for now.
- **Offline sync:** hand-rolled **queue-and-flush** first (tractable for us: client-generated
  UUIDs = no ID reconciliation; append-heavy + "everything is yours" = rare conflicts,
  last-write-wins). **PowerSync** is the escape hatch if it gets painful.
- **3d (GeoJSON export/import): dropped.** A backend supersedes its purpose; Supabase export
  preserves the "never trapped" guarantee.
- **Frontend hosting stays GitHub Pages** (free, static) — it just now talks to Supabase.
- **Cost:** free tier during the active build weekend (stays awake while active); flip to
  **Supabase Pro (~$25/mo)** by ~6/20 before broad sharing + photo uploads. Domain ~$11/yr.
  Free projects sleep after ~7 idle days (data preserved, one-click restore).

---

## 3. Two different "offlines" (don't conflate)

1. **Offline data sync** — record beta at the crag (no signal), sync up on reconnect.
   Needed for the sharing milestone. (Stage B1.)
2. **Offline map tiles** — the basemap doesn't go blank with no signal (original Phase 2).
   Needed for at-the-crag navigation. (Stage B2.)

---

## 4. Target data model (Supabase / Postgres)

- `profiles` — id (= auth user), display_name. Created on first sign-in.
- `pins` — id (uuid, client-gen), author_id, category, label, notes, lng, lat, created_at,
  updated_at.
- `tracks` — id, author_id, name, notes, start (jsonb anchor), end (jsonb anchor),
  geometry (coordinates), length_m, created_at, updated_at.
- `notes` — id, author_id, target_kind ('route'|'wall'), target_id, text, created_at,
  updated_at. NOTE: now **many per target** (each authored) — this is already the seed of
  the comment/social model.
- `photos` — id, author_id, target_kind, target_id, storage_path, created_at. Blob lives in
  Supabase Storage; row references it.
- OpenBeta walls/routes stay **bundled + read-only** (seed). User-created routes/walls are a
  later table; out of scope for v1 unless time allows.
- **Row-Level Security:** anyone can read; only authenticated users can write; users may
  edit/delete only their own rows.

---

## 5. Stages & sequencing (toward 6/20)

### Stage A — Sharing backbone (free tier, build weekend)
- **A1.** Supabase project: schema (§4) + RLS + auth (magic-link) + invite-link flow.
- **A2.** Auth UI: sign-in, "who am I", invite-link onboarding (messageable).
- **A3.** Rewire `src/data/*.js` to read shared data from Supabase and write up (online
  path first). Keep IndexedDB as the local cache.
- **A4.** Photos → Supabase Storage (upload on save; thumbnails via signed/public URLs).
- **A5.** Attribution in the UI: show who left each pin/note/trail/photo.

### Stage B — Crag-ready
- **B1.** Offline write queue + sync-on-reconnect (queue-and-flush; photo upload queue).
- **B2.** Offline map tiles — per-area download (original Phase 2; scope to per-area, not
  whole-state).
- **B3.** Offline read cache of shared data (so buddies see beta with no signal).

### v1 "done" (target 6/20)
A buddy can: open the app, see Cole's trail/photos/notes for an area, and — for an area
preloaded while on wifi — navigate it at the crag in airplane mode. Cole can record beta
offline and have it sync when back online. Both are identified users. Pro tier on.

---

## 6. Risks & honest caveats

- **6/20 for A+B is aggressive.** If time runs short, the fallback priority is: A (online
  sharing) → B1 (offline data sync) → B3 (offline read) → B2 (offline tiles). For an actual
  crag test, B2 (tiles) matters most for navigation — revisit the tradeoff mid-build.
- **Photo storage/bandwidth** scale with use; move photos to Cloudflare R2 (no egress fees)
  at the turning point if costs bite.
- **Invite/auth friction** for non-technical buddies — the invite-link UX must be dead
  simple; test it on a real buddy early.
- **Liability grows** when beta becomes visible to others (safety-critical info). Keep the
  disclaimer; revisit wording before broad sharing.
- **Supabase anon key is public** by design — RLS is what protects data. Get RLS right.
- **Free-tier pause** if idle >7 days between build and test weekends (one-click restore).

---

## 7. What is explicitly NOT in v1

- Moderation / approval dashboard (turning-point feature).
- Stranger/public contribution (invite-only writes for now).
- **Harden wall-location corrections at the scale turning point.** Corrections are
  shipping now as *anyone-signed-in-can-edit, last-write-wins* (see §9). Once strangers
  arrive, revisit with consensus/voting, edit history, or locking so a bad or malicious
  move can't silently overwrite a good GPS fix.
- Per-photo captions, user-created routes/walls (unless time allows), comment threading UI
  (the data model leaves room; the UI comes later).
- Native app-store builds (Capacitor) — PWA install is enough.

---

## 8. Future: backend route re-architecture (evidence-gated, NOT v1)

**Why:** OpenBeta route data is currently SNAPSHOTTED into a JSON file bundled into the app
(`src/data/seed/western-co.json`, regenerated by `scripts/fetch-openbeta.mjs`). As of
2026-06-13 the seed covers Unaweep, Colorado NM, SE Utah (Moab/Indian Creek), Glenwood
Springs/Canyon, and Independence Pass = **~1,685 walls / 7,325 routes**, which pushes the
main JS bundle to ~2.7 MB (738 KB gzip) and required raising Workbox's precache cap. **This
is the practical ceiling of the bundle-it approach** (~5–10k routes). OpenBeta has ~206k US
climbs total (CA 36k, CO 30k…), so any broad/national expansion needs a different model.

**The re-architecture (trigger: real demand for coverage beyond the seeded regions):**
- **Move route/wall data into Supabase** (Postgres + PostGIS), imported via an adapted
  `fetch-openbeta.mjs` that writes to the DB instead of a JSON file. Routes are read-only
  seed data (distinct from user contributions); RLS = world-readable, no writes.
- **Load by map viewport** — replace the bundled `getWalls()` in `src/data/routes.js` with a
  spatial query for walls in the current bounds (bbox / PostGIS `ST_Within`), debounced on
  map move. The data layer (rule 2) is the only thing that changes; UI is untouched.
- **Offline becomes per-area** — "Save area offline" (already built for tiles) also caches
  that area's walls/routes into IndexedDB, instead of bundling the whole dataset. Reuses the
  Stage B cache machinery.
- **Keep the personal/shared layer (pins/trails/notes/photos) exactly as is** — this only
  changes how the OpenBeta *base catalog* is stored and fetched.

**Effort:** moderate — mostly `routes.js` + an import script + a per-area cache path. The
locked data-layer separation is what makes it contained. Cost: route text is small (~tens of
MB) — fits Supabase Pro. Licensing: OpenBeta route text is CC0 (fine); never their photos.

---

## 9. Wall-location corrections (building now, 2026-06-13)

**Why:** OpenBeta coordinates are imperfect (e.g. ~800 Unaweep walls share one fallback
point). Fixing them makes crags findable. Corrections are a writable OVERRIDE layer over the
read-only seed; routes inherit their wall's coords, so we correct WALLS only.

- **`wall_overrides` table** (Supabase): `wall_id` (OpenBeta uuid, PK), `lng`, `lat`,
  `author_id`, `updated_at`. RLS: world-read; any signed-in user may insert/update
  (last-write-wins, attributed). Reset = delete the row.
- **`src/data/overrides.js`**: `getOverrides()` (cached for offline), `setOverride(wallId,
  lng, lat)`, `resetOverride(wallId)` — all through the Stage B cache/outbox so corrections
  work offline and sync on reconnect.
- **Merge in the data layer**: `getWallsGeoJSON(filter, overrides)` uses the corrected coord
  when an override exists, else the seed coord. UI unchanged.
- **UX**: WallSheet "Fix location" (signed-in) → reuse the pin-placement flow (use-my-
  location / tap / drag, satellite helps) → save. Shows "moved by X" + "Reset to original".
