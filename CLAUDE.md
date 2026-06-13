# PROJECT BRIEF — Western Slope Climbing App (working name: TBD)

This file is the project's constitution. It captures the goals, scope, architecture
decisions, and reasoning agreed between Cole and Claude (June 2026, claude.ai
feasibility study). Every future decision should be checked against this document.
If a proposed change conflicts with it, flag the conflict explicitly before proceeding.

---

## AMENDMENT 2026-06-13 — v1 is now multi-user (read this first)

The project pivoted: **v1's milestone is now sharing beta with a trusted group of
climbing buddies**, not solo use. This brings a backend forward into v1 — a conscious
product-owner decision by Cole. The sections below are updated to match; the active,
authoritative build plan lives in **`docs/v1-multiuser-plan.md`** (read it before
starting any v1 work). Phases 0/1/3 are done; Phase 2 (offline) is folded into the new
plan's Stage B. Where this amendment and the original text below differ, this amendment
wins.

---

## 1. WHO THIS IS FOR

Cole: rock climber based in Grand Junction, CO. Not a professional developer —
acts as product owner, tester, and decision-maker. Claude Code does the
implementation. Explanations should be plain-language; Cole learns the dev
workflow as we go, not programming syntax. He prefers being challenged on
assumptions over uncritical agreement.

Time budget: ~3-5 hours/week. Sessions should end at usable checkpoints.
Money budget: ~$0 (free tiers only; optional ~$11/yr domain).
[AMENDED 2026-06-13: Cole will pay ~$25/mo (Supabase Pro) once sharing goes live;
keep spend at $0 until then. Real money still waits for the scale turning point.]

## 2. GOALS, IN PRIORITY ORDER

1. **Scratch Cole's own itch.** A climbing route app he personally uses at
   western Colorado crags. If a feature doesn't serve Cole-the-climber, it waits.
2. **"I built this."** Finished, polished, real. Portfolio piece.
3. **Optional future money.** Only pursued if organic traction appears
   (climbing partners asking "what app is that?"). Never the driver of
   current decisions.

**Explicit NON-goals (do not drift toward these):**
- Competing with Mountain Project nationally
- ~~User accounts, social features, or a backend (until traction demands it)~~
  [AMENDED 2026-06-13: a backend + lightweight identity ARE now in v1, to enable
  friend-group sharing — see `docs/v1-multiuser-plan.md`. Still NOT in v1: moderation,
  stranger/public contribution (writes are invite-only), and the full social UI
  (comment threads). Those wait for the scale turning point.]
- App store presence in v1
- Monetization features in v1
- Supporting regions beyond western Colorado in v1

## 3. THE PRODUCT

A mobile-first **PWA** (installable web app) for finding and navigating to rock
climbing routes on Colorado's Western Slope, that works **fully offline** at
the crag.

Core capabilities (v1):
- Interactive map of western CO climbing areas and routes, seeded from OpenBeta
- Tap a route: name, grade, type (sport/trad/boulder), description, star rating
- **Download an area for offline use** (map tiles + route data) — the hero feature
- **Personal pins**: parking spots, approach trails (GPS-recorded while walking),
  custom notes and photos attached to routes/areas — stored locally on device
- GPS "where am I" relative to routes and approach trails

The differentiator vs Mountain Project: approach beta (parking + trail to the
wall) and reliable offline access. "I can't find the wall" is the problem we
solve best.

## 4. ARCHITECTURE DECISIONS (LOCKED — do not violate without explicit discussion)

These three rules exist so the app can scale to app stores WITHOUT a rebuild:

1. **React** (with Vite). Structured components, no freeform spaghetti.
   Future path: wrap with Capacitor for iOS/Android stores — same codebase.
2. **Strict data-layer separation.** All data operations (fetch routes, cache
   offline, store pins) live in a dedicated module (`src/data/`) that UI
   components only call through a clean interface. UI never talks to storage
   or APIs directly. Rationale: when/if a shared backend replaces local
   storage, only this module changes.
3. **MapLibre GL JS** for maps. Open source, no per-user licensing, works
   identically in browser and Capacitor. Offline tile caching builds on it.

Additional standards:
- Offline storage: IndexedDB (route data, pins, photos) + Cache API via
  service worker (map tiles, app shell)
- Hosting: GitHub Pages (same workflow as Cole's Mesa Edge site)
- Photos: Cole's own only. OpenBeta route *content* is open-licensed (CC0),
  but OpenBeta photos are NOT included in that license — never import them.
- Keep dependencies minimal; prefer boring, well-documented libraries.

## 5. DATA

- **Seed source:** OpenBeta GraphQL API (https://openbeta.io, github.com/OpenBeta).
  Query areas/routes by geography. Western CO scope: roughly Grand Junction,
  Unaweep Canyon, Colorado National Monument, Rifle, Glenwood/Roaring Fork,
  Escalante Canyon, Naturita/Paradox area.
- **Strategy:** fetch and snapshot OpenBeta data into the app's own storage
  format rather than live-querying at the crag (no service there anyway).
  Design the local data model so a route's source (openbeta vs cole) is tracked.
- **Cole's personal data** (pins, tracks, notes, photos) is a separate layer
  overlaid on seed data, exportable as files (GeoJSON) so it's never trapped.

## 6. PHASE PLAN

Each phase ends with something Cole can physically use. Do not start phase N+1
with phase N broken.

- **Phase 0 — Setup** (1 session): repo, Vite+React scaffold, MapLibre map
  rendering, deployed to GitHub Pages, installable on Cole's phone.
- **Phase 1 — Routes on the map** (1-2 wks): OpenBeta data for western CO
  displayed as pins/clusters; route detail view; search/filter by grade & type.
- **Phase 2 — Offline** (2-3 wks, the hard one): "download this area" →
  map tiles + route data cached; full functionality with airplane mode on.
  Scope discipline: per-area downloads, NOT whole-state.
- **Phase 3 — Personal layer** (1-2 wks): parking pins, GPS approach-trail
  recording, notes, photo attachments. Local-only, exportable.
- **Phase 4 — Crag testing** (ongoing): real-world use drives the backlog.

Definition of v1 done: Cole navigates to a crag he's never visited using only
the app, with phone in airplane mode from the trailhead.

[AMENDED 2026-06-13: Phases 0, 1, and 3 are DONE (routes/filter/detail; pins; GPS
trails; notes & photos). Phase 2 (offline) is now Stage B of `docs/v1-multiuser-plan.md`.
v1's definition is EXTENDED: not just solo airplane-mode navigation, but a trusted
buddy can see Cole's shared beta (trail/photos/notes) for an area and navigate it
offline. Target date: 2026-06-20.]

## 7. SCALE PATH (future, evidence-gated)

Only advance a stage when the previous stage shows real demand:
1. Personal PWA (done) →
2. **Friend-group sharing (v1, NOW)** — Supabase backend, invite-only identified
   writes, open read, no moderation. Brought forward from stage 3 per the 2026-06-13
   amendment. See `docs/v1-multiuser-plan.md`. →
3. Open/public platform (if strangers use it): moderation/approval, public contribution,
   full social UI, photo-hosting cost optimization, possibly Capacitor app stores →
4. Anything bigger (champagne problem; revisit everything then)

Monetization, if ever: freemium offline downloads, regional sponsorships.
Decided then, not now.

## 8. DECISION PRINCIPLES

- Smallest real version first; evidence before investment.
- Cole's at-the-crag experience outranks architectural elegance,
  but never violate Section 4 to ship faster.
- When Cole reports a bug, reproduce it before fixing it.
- End every session with the app deployed and working — never leave it broken.
- If a task balloons past ~2 sessions, stop and simplify the scope rather
  than grinding.
- Liability note: this app guides people to cliffs. Include a plain
  disclaimer screen, and never auto-generate safety-critical info (anchors,
  gear placements) — only display sourced or Cole-entered data.

## 9. OPEN QUESTIONS (revisit as they become relevant)

- App name (needed before Capacitor stage; "TBD" fine for personal use)
- Exact western CO area list to seed (start: Unaweep + Colorado National
  Monument + Rifle; expand per Cole's climbing habits)
- Grade display preference (YDS primary; boulder V-grades where applicable)
- Whether approach-trail recording needs background GPS (Capacitor-only
  feature) or foreground-only is acceptable for v1
