# Growth & Architecture Plan: Western Slope Climbing

*Draft for Cole to review/edit, then hand back stage-by-stage to build.*
*Author: Claude (architecture). Date: 2026-06-29. Supersedes nothing. Sits alongside
`v1-multiuser-plan.md` (which is now "done"). Optimizes, in priority order:
**(1) value to climbers, (2) future monetizability (baked in, not activated),
(3) correct architecture at each stage of growth.***

Legend: **[DECISION]** = a call I've made and recommend, but you can overturn.
**[EVIDENCE GATE]** = don't advance until this is true.

---

## 0. The one-paragraph thesis

Mountain Project owns the *route database* and its SEO. It will not be dethroned there,
and trying is the explicit non-goal. But MP (and guidebooks) are structurally weak at the
thing that actually ruins climbing days: **getting to the wall, and having your beta when
you have no signal.** That gap, *approach + offline + local freshness*, is real,
defensible via community-contributed local data, and under-served. The plan is to **own
that wedge in a beachhead region (the Western Slope), prove the growth loop, then expand
region-by-region as evidence allows**. Staying a PWA until the offline/GPS ceilings force
a native wrapper. Build for value now; leave clean seams so money is *possible* later
without a rewrite.

---

## 1. VALUE: the real problems climbers have (priority #1)

What's actually broken about how climbers find and do routes today:

1. **"I can't find the wall."** The #1 lived pain. MP route pages are rich on the *climb*
   but thin/stale on the *approach*. Parking is a sentence ("park at the pullout"), the
   trail is prose, there's no GPS track. People routinely waste 30–90 min, hit the wrong
   crag, or bail. Guidebooks have approach maps but they're paper and frozen in time.
   **→ Our solve:** parking/trailhead pins + GPS-recorded approach trails + the
   "Getting there" rollup on each wall. This is the sharpest blade we have.

2. **No signal at the crag.** Most crags are dead zones. MP's offline is paywalled and
   clunky; AllTrails is offline but not climbing-aware (no routes/grades/approach-to-wall).
   **→ Our solve:** "Download this area" → tiles + routes + notes + photos, fully usable
   in airplane mode. Already built and now hardened.

3. **Beta is fragmented and stale.** Info is scattered across MP, guidebooks, forums,
   Instagram, and friends' texts. Access changes (new parking, seasonal closures,
   raptor closures), conditions, and "which lines are actually worth it" go stale fast.
   There's no single *fresh, local* source per area. **→ Our solve:** a trusted local
   community keeping one area's beta current. Notes, photos, corrected wall locations,
   ascents. Freshness is a moat MP's scale can't match locally.

4. **Logging is divorced from navigation.** Ticking climbs lives in a separate, dated MP
   list. **→ Our solve:** logging + the grade pyramid live right where you navigate; the
   activity feed makes it social. Strava-style pull-back without leaving the app.

5. **The tools feel dated.** MP's UX is cluttered and old. Younger climbers notice.
   **→ Our solve:** a fast, phone-first, modern PWA that does a few things beautifully.

**The honest limits of the value story (so we don't fool ourselves):**
- These are *feature* gaps, not a greenfield market: MP or AllTrails *could* add them.
  Our defensibility is **(a) community-contributed local approach data with a per-region
  network effect, and (b) focused execution/UX.** We must build the local data moat in a
  region *before* an incumbent bothers with the niche.
- **Access sensitivity is a genuine risk, not a footnote.** Publicizing parking/approach
  to sensitive crags can cause real land-manager closures, the climbing community is
  touchy about this for good reason. This shapes product decisions (below), and it's also
  a *trust* asset if we handle it respectfully.

**[DECISION] The wedge, stated as a sentence we optimize everything against:**
*"The app that gets you to the wall and works with no signal, for the areas you actually
climb."* Approach + offline + local freshness. We complement MP; we don't replace its
route DB.

---

## 2. MARKET & MOAT

- **Mountain Project**: national route DB, all SEO-driven, free, entrenched. *Weakness:*
  approach/offline/UX, and no incentive to fix a regional niche. *Our stance:* don't
  compete on route content or search; beat them on the approach/offline experience.
- **AllTrails**: proves two things we care about: **offline downloads are a monetizable
  hero feature**, and approach/navigation is a real wedge. *Weakness:* not climbing-aware.
- **theCrag / 27 Crags**: global climbing DBs, logging-focused, weak approach/offline,
  modest US traction. *Our stance:* narrower + deeper + offline-first beats broad.
- **OpenBeta**: the open-data commons our seed comes from (CC0 route content). Ally, not
  competitor. Note: it has grades/coords but **no descriptions**, so our value is
  *contributed* beta, not imported prose.

**Moat = per-region contributed approach data + freshness + execution.** It compounds:
each region that locals fill in becomes hard to leave and hard for a generalist to match.

---

## 3. STRATEGY TO SCALE (responsible, <5 people, season window)

**[DECISION] Beachhead-and-expand, not broad launch.** Own **the Western Slope** first
(Grand Junction home turf, you have local credibility, can seed data yourself, know the
crags and the community). "Own it" = every popular wall has parking + approach + offline,
and a handful of locals are contributing. Then expand to the next-most-requested Colorado
areas (Rifle, Independence Pass, RMNP...) *driven by where users ask*, repeating the same
seeding playbook. This is the only scope that a tiny team can execute to a quality bar
during a single season, and it's exactly where the moat is strongest.

**The growth loop (the engine, memorize this):**
1. You + a few locals seed approach beta for the beachhead crags →
2. the app is *uniquely* useful there, especially offline →
3. climbers share route/area links and invite belay partners (built-in) →
4. new users add more beta (ticks, notes, photos, corrections) →
5. → back to 2, now richer. Expansion = point this loop at a new region.

The engine is **contributed local beta + sharing**, *not* SEO. (SEO is a multi-year burn
we'd lose to MP; we deprioritize it. See §6.)

**Season timing:** the window is now. The Stage 1 list (§7) is scoped to capture it:
make it joinable (open sign-up + real email), shareable (link previews), measurable
(analytics), and *seed the beachhead crags*, then post the offline/approach hook into
Western Slope climbing communities (FB groups, r/COclimbing, gym boards, the GJ climbing
scene). One sharp value prop, to the exact people who feel the pain.

**[DECISION] Distribution is targeted-community, not paid/ads/SEO.** Highest ROI for a
niche tool with a local moat, and it's free.

---

## 4. FORM FACTOR: PWA now, native at a trigger

**[DECISION] Stay PWA through beachhead PMF; wrap in Capacitor at a defined trigger.**

Why PWA now: free, instant updates, no store review, one codebase. Ideal for
build-build-build and finding fit. Why native *eventually* isn't vanity, the two things
a PWA does badly are **exactly climbing-critical**:
- **iOS offline-cache eviction:** iOS can purge IndexedDB/Cache after ~7 days of app
  inactivity. For "download an area, drive up next weekend," that's a landmine. We
  mitigate (install nudge, `storage.persist()`, eviction-detect + re-download), but can't
  fully beat it on iOS PWA. *Native storage isn't evicted.*
- **Background GPS:** approach-trail recording is foreground-only today; recording with
  the phone in your pocket needs native background location.
- Plus store **discoverability + trust** for broader growth, and web-push limits on iOS.

**[EVIDENCE GATE → go native]** when *either*: (a) iOS users report losing offline data
between trips, or (b) you're ready to push growth beyond word-of-mouth and want store
presence. Not before. It's a packaging step at a milestone, not a rewrite, because the
data layer is already isolated (CLAUDE.md rule 2).

---

## 5. MONETIZATION POSTURE: scale first, keep options open, preserve seams

**[DECISION] Activate nothing now. But bake in two cheap architectural seams** so any model
stays open without rework:

1. **Entitlement seam** around premium-capable actions (offline downloads, premium/extra
   regions). Implement as a trivial `canDownloadArea(user) → true` today. Everything free
, but route the check through one function so a future freemium tier (the proven
   AllTrails model, and the natural fit for our hero feature) is a config change, not a
   refactor.
2. **Attribution / region-ownership seam**: content already tracks author/source; extend
   the *area* model to carry an optional `owner`/`sponsor`/`source` field. Enables future
   B2B (gym/guide/tourism-board sponsored regions, co-branded offline packs) without
   touching consumer UX.

Most likely eventual models given the product: **freemium offline** and/or **B2B regional
sponsorship**. We design so both remain possible; we pick when there's traction and cost
pressure. (Your brief: monetization decided *then*, not now.)

---

## 6. ARCHITECTURE: staged, each stage correct for its scale

Current stack: React+Vite PWA · MapLibre · Supabase (Postgres/Auth/Storage/RLS) ·
IndexedDB read-cache + outbox (offline) · vite-plugin-pwa/Workbox · **bundled** regional
route seed (~1.2MB chunk) · strict data-layer separation · Vitest + build guards.

### Stage 0: NOW (done): trusted-group PWA
Feature-complete, offline-hardened, tested, moderated. Invite-flavored (open read,
auto-approved writes), single bundled region, magic-link auth. *Nothing to do here.*

### Stage 1: Public-ready beachhead  *(immediate; the season play)*
**Goal:** open the doors, make it shareable + measurable, harden iOS offline. *without*
changing the core data architecture. Detailed build list in §7.
- **Auth:** custom domain + Resend SMTP (reliable magic links); add a low-friction option
  (Google sign-in and/or passkeys). Magic-link on an installed PWA is clunky.
- **Open sign-up**, leaning on the moderation/soft-delete already built; add basic rate
  limiting. Add an **access-sensitivity control** (ability to mark a pin/area as
  "sensitive. Don't broadcast," even if just a norm + a flag now).
- **Analytics** (Plausible/Umami: privacy-friendly): installs, WAU, area downloads,
  contributions, shares, which areas get requested. *You are flying blind without this.*
- **Rich link previews** (Open Graph on the shell; generic first).
- **iOS offline hardening:** install nudge, `storage.persist()` UX, eviction detection +
  graceful re-download, "download before you go" reminder.
- **Seams (no-ops):** `canDownloadArea()` entitlement gate; area `owner/source` field.
- **Architecture:** unchanged core; bundled seed stays. Additive only. Low risk.
- **Key risks:** iOS eviction (mitigated, not solved); access sensitivity (handle with the
  flag + a respectful norm); don't over-broadcast parking to touchy crags.

### Stage 2: Multi-region + contribution scale
**[EVIDENCE GATE]** people outside your circle use it weekly *and* ask for areas you don't
cover; beachhead loop demonstrably works.
- **The big architectural evolution:** move route data from the bundled JSON → **Supabase,
  queried by map viewport** (PostGIS or lat/lng-indexed), with **download-a-region** for
  offline (extends today's "Save area offline" to route data). This is the nationwide
  architecture we deliberately deferred. Now justified by evidence, and *bounded* by
  doing it region-by-region, not a 206k big-bang.
- **Areas become first-class** (ownership/attribution seam pays off; region download packs
  align with the entitlement seam).
- **Moderation matures** toward approval/queue if strangers arrive (your scale-path
  Stage 3). Photo/tile **bandwidth → CDN**; watch Supabase egress (the real cost center).
- **Offline stays first-class** for downloaded regions: never regress the hero feature.
- **Key risks:** data quality/moderation at scale, geo-query performance, infra cost.

### Stage 3: Native wrapper + growth
**[EVIDENCE GATE]** iOS offline pain reported, or you're pushing growth beyond word-of-mouth.
- **Capacitor** wrap → App Store / Play Store. Wins: durable native storage (kills the
  eviction problem), background GPS (proper approach recording), push, discoverability,
  trust. Same codebase; data layer already portable.
- **Key risks:** store review cycles, two distribution channels to maintain.

### Stage 4: Sustainability / business
**[EVIDENCE GATE]** real, sustained traction + cost pressure.
- Activate a model via the Stage-1 seams: **freemium offline** and/or **B2B regional
  sponsorship**. Cost optimization (photo storage tiers; consider self-hosted PMTiles for
  the bulletproof offline upgrade). Ops shaped for a <5-person team (boring, well-tested,
  low-maintenance, the test suite + guards we built are exactly this discipline).

*Guiding principle across all stages (your brief): smallest real version first, evidence
before investment, and never violate the data-layer separation to ship faster.*

---

## 7. IMMEDIATE BUILD LIST (Stage 1): prioritized, this is what you'd send me first

Ordered by leverage-per-effort. Each is independent and shippable.

1. **Custom domain + Resend SMTP** *(small; unblocks everything).* Reliable sign-in,
   trust, email sender. Needs you to buy the domain + set DNS. I'll write the runbook.
2. **Analytics** *(small).* Plausible/Umami. Can't steer without it.
3. **Rich link previews (OG tags)** *(small).* Every shared link becomes a growth surface.
4. **Open sign-up + basic rate limiting + access-sensitivity flag** *(small–med).*
5. **iOS offline hardening** *(med).* Install nudge, persisted-storage UX, eviction detect
   + re-download, "download before you go" reminder. Protects the core promise.
6. **Monetization seams as no-ops** *(small).* `canDownloadArea()` + area `owner/source`.
7. **Onboarding polish for the value prop** *(small).* Make the first-run scream
   "offline approach beta for your crags."
8. **(You, not code) Seed the beachhead crags + post to Western Slope communities.**

I'd ship 1–3 first (the "joinable + shareable + measurable" trio), then 5 (protect the
promise), then the rest.

---

## 8. METRICS / EVIDENCE GATES (how we know when to advance)

Track from Stage 1: installs, weekly active users, **D7/D30 retention**, % of users who
download an area, **contributions per region**, shares per user, and **which areas get
requested**. Stage 2 unlocks when non-circle WAU is real and area requests pile up. Stage 3
unlocks on iOS-offline complaints or a growth push. Stage 4 on sustained traction.

---

## 9. TOP RISKS (cross-cutting) & mitigations

- **iOS PWA offline eviction**: biggest technical threat to the value prop → mitigate in
  Stage 1, solve in Stage 3 (native).
- **Access sensitivity / land managers**: publicizing parking can cause closures →
  sensitive-content flag + respectful norms; possibly group-only pins for touchy crags.
- **Incumbent copies the wedge**: MP/AllTrails add approach → outrun via the per-region
  community data moat + UX + speed; own the region before they care.
- **Data quality / liability**: never auto-generate safety-critical info (brief);
  disclaimer already present; moderation tools already built.
- **Small-team bandwidth**: keep the architecture boring and tested; resist premature
  scale (nationwide, native, SEO) until evidence demands it.

---

## 10. OPEN DECISIONS FOR COLE (edit these, then send me to build)

- [ ] Confirm the **beachhead = Western Slope** and the wedge sentence (§1).
- [ ] OK to **open sign-up** to strangers (with moderation) this season? (vs. staying invite-y)
- [ ] Buy a **domain**? If yes, pick a name: unblocks item 1.
- [ ] Any hesitation on **analytics** (privacy posture)? Plausible is cookieless/anonymous.
- [ ] Green-light the **Stage 1 build order** in §7, or re-rank.
- [ ] Pick a **name** (see §12 shortlist) so the domain can be bought.

---

## 11. SESSION REFINEMENTS (2026-06-29): read alongside the sections above

Decisions locked with Cole this session. Where they modify an earlier section, noted.

### 11a. THE DATABASE: import the scaffolding, crowdsource the soul *(defines the product)*
The two assets are **the user base** and **the database**. The database strategy is NOT
import-vs-build. It's two layers:
- **Import OpenBeta as the *skeleton*** (route names, grades, rough coords) for targeted
  regions. Its only jobs: make the map non-empty (kills cold-start) and give contributions
  an *anchor*. It is scaffolding, not the product.
- **Crowdsource the *soul***: approach beta, parking, trails, notes, photos, corrected
  locations, freshness. This is the differentiator, exists nowhere else, and is what people
  get excited to build. Users may also **create walls OpenBeta misses** (it's incomplete),
  filling gaps on top of a never-empty map.

Rationale: pure crowdsource dies of cold-start (empty map → users leave) and asks people to
hand-enter commodity data (route names/grades). Tedious, unexciting. Pure import = a worse
Mountain Project. The skeleton makes contribution *low-friction and rewarding* ("add parking
to this wall" ≫ "create a wall from scratch"); the contributed beta is the compounding,
per-region network-effect moat. This is how Waze/Strava escaped cold-start: seed the base,
let UGC compound. **[DECISION] Layer them; don't choose.**

### 11b. CONTRIBUTION AS THE PRODUCT'S HEART: make it delightful
Because the moat IS the contributed beta, contribution UX gets first-class product energy:
dead-simple "add parking / record approach / add note+photo" flows, immediate visibility,
strong attribution ("you added this, it's helped N climbers"), and later a contributor
reputation/leaderboard. Onboarding leads with the mission ("help build the best approach
beta for your crags"). This is the engine of both retention and virality.

### 11c. ANALYTICS: tight and deliberate, not a data mess
**[DECISION]** ONE cookieless, no-PII tool (Plausible or self-hosted Umami, no cookie
banner). Track ONLY a small event set mapped 1:1 to the evidence gates (§8):
`sign_up`, `area_downloaded`, `contribution_created`, `share`, and weekly-active (pageview).
Nothing else. It's a scoreboard for the scale plan, not a surveillance layer.

### 11d. MODERATION: trust tiers, designed now
Open sign-up is a go. Bake the moderation ladder in as we scale (not all at once):
- **Stage 1:** open read; tracked contributions; soft-delete + admin revert (built); add a
  user **report/flag** button + **basic rate limiting**; design a **trust-tier** field now.
- **Growth:** trust tiers gate *high-risk* edits (wall locations, others' content) from new
  accounts; low-risk (own ticks/pins/notes) stays open. Add **ban/block** + audit log.
- **Scale:** approval **queue** for high-risk edits from low-trust accounts.

### 11e. EMAIL: consented, secondary
Cheap `marketing_opt_in` flag captured at sign-up (unchecked default, separate from the
transactional auth email). Product-newsletter use later; not a priority. An owned audience
that quietly accrues.

### 11f. EXPANSION: targeted regions, contribution-gated, guard = migration trigger
(Reaffirms §3/§6.) Add a region when a real evangelist will seed it (e.g. Alaska friends),
via a targeted OpenBeta import, NOT a national dump. This rides the current bundled
architecture until the seed nears the 4 MB precache guard; **that guard firing is the
evidence-gated trigger to migrate routes → Supabase (Stage 2).**

### 11g. Stage 1 build list: additions from this session
Add to §7: **report button + rate limiting** (with open sign-up), **trust-tier schema**
(design now), **marketing_opt_in flag**, and the **tight analytics taxonomy** above. Domain
move is one coordinated base-path change (Vite `base:'/'` + Supabase redirect URLs + SW
scope), gated on the name.

---

## 12. NAMING: shortlist to react to (pick one → buy the domain)

Directions: **trail-marker** (cairns = the rock stacks climbers use to mark approaches,
on-theme for "find the wall"), **approach/waypoint**, **local-beta**. Candidates (check
.com/.app availability on Cloudflare before committing):

1. **Cairn** / **Cairned**: trail-marker metaphor; "we mark the way to the wall."
2. **Approach** / **theApproach**: names the exact job.
3. **Beta** / **BetaBook** / **LocalBeta**: climber term for the info itself.
4. **Waypoint** / **Crag Waypoint**: navigation to the crag.
5. **Sendpoint**: pun on "send" (climb) + destination.
6. **Trailhead**: where the approach begins.
7. **Crux**: climbing term; the hard/key part.
8. **OffBelay** / **Beta Cache**: offline + beta nod.

*My lean:* **Cairn**. Evocative, on-theme (guiding you in), short, brandable. Likely needs a
qualifier for the domain (getcairn/cairnapp/climbcairn). Your call.
