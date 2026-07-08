# HANDOFF — read this before touching anything

*Written 2026-07-03 by the outgoing model (Fable), at Cole's request, on the eve of a
model changeover. This is the institutional memory that isn't derivable from the code.
Read order for a new session: `CLAUDE.md` (constitution) → `docs/growth-architecture-plan.md`
(strategy, authoritative) → `docs/launch-kit.md` (go-to-market) → this file (how to actually
work here). Claude-family models also get an auto-memory index; the REPO docs are the
source of truth — memory is convenience.*

---

## 1. Where the project stands (one paragraph)

**Cragward (cragward.com) is launch-ready.** A React+Vite PWA on GitHub Pages (custom
domain, HTTPS enforced), Supabase backend (Postgres/Auth/Storage/RLS, magic-link email via
Resend SMTP from noreply@cragward.com), full offline system, open sign-up, moderation
(report → soft-delete/undo, rate-limited writes), Umami analytics, High Desert design
system. All Stage 1 items from the growth plan are DONE, including the rate-limit
migration (ran 2026-07-03). What remains is **Cole's launch checklist, not code**:
device test pass (launch-kit §0), fix the Supabase email template branding (still says
"Western Slope Climbing" — dashboard-only), seed 3–5 flagship crags with real beta, post
Draft A to Western Slope climbing communities, then let evidence drive the backlog.

## 2. How to work with Cole (this matters more than the code)

- Plain language, no jargon dumps. He's the product owner/tester, not a developer, and
  he's sharp about product. **He explicitly wants pushback** — "please push back if you
  know something I don't" is a standing request. Uncritical agreement loses his trust;
  the pattern that works is *diagnose honestly → recommend one thing → execute fully*.
- He makes fast, good scope calls when you frame the tradeoff cleanly (see: he killed
  the premature nationwide import himself once the cold-start reality was laid out).
- **He runs all Supabase dashboard/SQL steps** — you never have dashboard access. The
  established migration pattern: write the SQL to `supabase/migrations/DATE-name.sql`,
  tell him to paste it, **verify the schema yourself** (query the column/function via
  the anon client) before deploying any code that WRITES to it. Reads are usually safe
  to ship first; writes are not. We once held a deploy on `main` for exactly this
  ("HOLD DEPLOY" commit b93b059) — that pattern works, use it.
- End every session with the app deployed and working (CLAUDE.md rule). He often says
  "go build it" and steps away — autonomous stretches are normal; leave a rundown:
  *shipped / what to check / what I need from you*.
- Never leave him a mystery: report failures plainly, with what you verified and what
  you couldn't (e.g. "verified anon path; the signed-in leg is your device test").

## 3. Non-negotiable invariants

1. **Data-layer separation** (CLAUDE.md §4): UI components call `src/data/*` only.
   Never let a component import supabase or idb directly.
2. **Offline is the product.** Anything touching `src/data/sync.js` (outbox), the SW
   config in `vite.config.js`, `src/data/areas.js`, or the bundled seed must keep
   airplane-mode working. The build guard `scripts/check-seed-size.mjs` (postbuild)
   fails if the seed chunk nears the 4MB Workbox precache cap — **that guard firing is
   the designed trigger to migrate routes into Supabase (growth plan Stage 2)**, not a
   thing to "fix" by raising the cap.
3. **Design discipline — High Desert** (tokens in `src/index.css`): neutrals do 90% of
   the work; terracotta (#b6532f) ONLY for primary actions and the wall dots; sky-teal
   for trails. **No emoji in the UI, ever** — use `src/components/Icon.jsx` (stroke
   SVGs). Map-layer colors live in `App.jsx`/`pins.js` and must stay in sync with the
   tokens. Cole rejected a previous warm palette for being muddy; the current one
   survives because of the restraint rule — keep it.
4. **Moderation model**: low-risk contributions open to all signed-in users; everything
   tracked (admin "Recent contributions" view) and undoable (soft-delete `deleted_at`,
   never hard-delete others' content); server-side enforcement is `public.is_admin()`
   RLS (profiles.role='admin'), NOT the client UID check (`VITE_ADMIN_USER_ID` in
   `.env.local` only gates UI visibility). Rate limit: 60 contributions/hr/user via
   insert policies.
5. **Evidence-gated roadmap** (growth plan §6/§8): do NOT build nationwide import, SEO
   prerendering, or Capacitor until their gates trip. New regions are added via
   targeted OpenBeta imports (`scripts/fetch-openbeta.mjs`, edit SEED_AREAS) only when
   a real contributor will seed beta there (e.g. Cole's Alaska friends).
6. **Liability**: never auto-generate safety-critical info. The disclaimer stays.

## 4. Environment & tooling gotchas (each of these cost real time once)

- **Node is NOT on PATH.** Prefix every command:
  `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH` (PowerShell).
- **PowerShell here-string commit messages**: NO double quotes, `<>`, or odd chars in
  commit messages — they explode the here-string and cause partial commits ("pathspec"
  errors). Plain prose only. If a commit fails this way, the deploy may still have
  shipped from the working tree — recommit cleanly.
- **Deploys**: `npm run deploy` (build → seed guard → gh-pages). **`git push origin
  main` is SEPARATE and was forgotten for 26 commits once** — push source after
  committing. Live site = cragward.com; CDN lags ~20-60s; the SW picks new builds up
  automatically now (a guarded `controllerchange` reload in App.jsx).
- **Remote browser/preview quirks**: MapLibre freezes in unfocused/backgrounded Chrome
  tabs (RAF throttling) — a "dead blank map" in remote testing is usually THIS, not a
  bug (we once burned an hour bisecting healthy code). Headless preview also can't
  grant persistent storage and has no SW, so `checkOfflineHealth()` reads "evicted" in
  dev — expected. Verify logic via evals/unit tests; verify visuals when the tab is
  active; trust the device tests for the rest.
- **Verification discipline before every deploy**: `npm run lint` (0 warnings),
  `npm test` (31 passing), `npm run build` (guard green). Add a test when touching
  data-layer logic — the suite exists because three offline bugs shipped un-caught.
- **The repo lives in OneDrive** — occasional file-lock weirdness; retries work.
- **Supabase**: project keys in `.env.local` (gitignored, never commit). Free tier
  until traction (Cole's call — do not push Pro). Redirect URLs must list
  `https://cragward.com/**` and `http://localhost:5173/` or magic links break.

## 5. Map of the system (fastest orientation)

- `src/App.jsx` — the orchestrator: map init/layers, all sheet routing, download flow.
- `src/data/` — routes (bundled seed, lazy `initSeed()`), pins, tracks (+ `getWallAccess`
  trail-link-first/proximity-fallback), notes (+photos +`prefetchBeta`), ticks, areas
  (saved-offline registry + eviction detection), overrides, reports, contributions
  (admin feed + `setContributionDeleted`), entitlements (`canDownloadArea` seam), sync
  (cache+outbox+quarantine), auth (offline user cache!), db (idb v9), supabase, pyramid.
- `src/components/` — sheets (Wall/Route/Feed/Admin/Auth/Search/OfflineAreas/PinEdit/
  Track*), Icon.jsx, GradePyramid, NotesPhotos, WelcomeOverlay.
- `supabase/schema.sql` — full rebuild-from-scratch DDL (kept current);
  `supabase/migrations/` — the incremental ones Cole actually ran, in order.
- `test/` — 31 vitest tests over the pure data layer. `scripts/` — seed fetch, icon
  gen (`node scripts/gen-icons.mjs` after editing the SVGs), seed-size guard.
- Offline model in one line: bundled seed (routes) + IndexedDB read-cache & outbox
  (user data) + Workbox runtime caches (tiles + photo bytes) + saved-areas registry
  (visibility/eviction detection) + cached auth identity (stays signed in offline).

## 6. Known rough edges / first candidates for future work

- Supabase **email template** text (Cole's dashboard task — may already be done by the
  time you read this; ask).
- `prefetchBeta` fetches whole notes/photos tables and filters client-side — fine at
  current scale, needs a server-side area key when tables grow.
- Per-route OG link previews need prerendering (deferred deliberately).
- Trust-tier field exists (`profiles.trust`) but nothing gates on it yet — that's the
  designed next moderation step when strangers arrive.
- Area owner/source attribution seam (monetization §5) not yet added to the schema.
- Old installed PWAs from the github.io era are dead — anyone who installed pre-domain
  must reinstall (only affects Cole + maybe one buddy).

## 7. The single most important thing

The next unit of progress is **not code**. It's Cole seeding real approach beta and
posting to the Grand Junction climbing community, then reading Umami + user feedback.
Resist the gravitational pull toward building; help him launch, watch what real
climbers do, and let that write the backlog. The plan (§8, growth doc) says exactly
when to build big things again. Hold him to his own rules — he asked for that.
