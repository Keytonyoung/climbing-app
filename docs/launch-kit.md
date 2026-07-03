# Cragward Launch Kit

*Drafts + game plan for the first public push. Edit freely — these are written in
"local climber sharing a tool" voice, not "startup launching a product." That
framing is deliberate: climbing communities are allergic to being marketed at,
and the moat is community goodwill.*

---

## 0. Pre-launch checklist (do ALL of these before posting anywhere)

- [ ] **Enforce HTTPS** ticked in GitHub Pages; https://cragward.com loads clean.
- [ ] **Your own device test pass** (the testing you flagged):
  - [ ] Sign up with a FRESH email (not your admin one) — does the magic link
        arrive fast, from noreply@cragward.com, and does the flow feel obvious?
  - [ ] Install the PWA on your phone from cragward.com (Add to Home Screen).
  - [ ] Download an area → airplane mode → confirm map, routes, notes, photos,
        pins, trails all work offline.
  - [ ] Add a pin / note / photo / tick as the fresh account — confirm it
        appears, and that the admin view shows it.
  - [ ] Report something as the fresh account; Remove/Undo it as admin.
  - [ ] Share a route link to a text/DM — does the preview card look right?
- [ ] **Seed the flagship crags.** Before strangers arrive, the 3–5 most popular
      Western Slope areas you know should each have: parking pin(s), a recorded
      approach trail (or at least a trailhead pin), and a couple of notes/photos.
      An empty app has no second visit. This is the highest-leverage prep work.
- [ ] Fix the Supabase email template branding (still says Western Slope
      Climbing → Cragward). Auth → Emails → Templates.
- [ ] Glance at Umami — confirm events are flowing from your own test pass.

---

## 1. The community post (primary channel)

### Where to post, in order
1. **Grand Junction / Western Slope climbing Facebook groups** (highest density
   of exactly-right users; post as yourself, a local).
2. **r/COclimbing** (read the sub rules first; some require mod approval for
   self-made tools — message the mods if unsure, it usually goes fine when
   you're transparent).
3. **Gym bulletin boards / front desk** (GJ area gyms — a small printed card
   with a QR code to cragward.com works great; people scan while bored).
4. **Mountain Project forum — Colorado regional** (later; MP forums are touchy
   about "competitor" tools. Frame as approach/offline companion, never as an
   MP alternative).

### Draft A — Facebook (local groups; personal, story-led)

> Hey all — local GJ climber here. I got tired of wandering around at the base
> of crags with no signal trying to figure out where the wall actually is, so I
> built a free little web app for our area: **cragward.com**
>
> What it does:
> - **Parking + approach beta** — pins for where to park, GPS-recorded trails to
>   the wall (the stuff MP is thin on)
> - **Works offline** — hit "Save area offline" on wifi, and the whole crag
>   (map, routes, notes, photos) works in airplane mode at the wall
> - Routes for Unaweep, the Monument, Escalante, and more (seeded from OpenBeta)
> - Log your climbs, drop notes/photos, fix wall locations that are off
>
> It's free, no ads, works on any phone (add it to your home screen). It gets
> better the more locals add beta — that's the whole idea. Would love for a few
> of you to kick the tires and tell me what's broken or missing. Be kind to
> access: there's a "sensitive" flag for anything that shouldn't be broadcast.

### Draft B — r/COclimbing (shorter, utility-led, disclosure up front)

> **[I made this] Free offline approach-beta app for Western Slope crags**
>
> Full disclosure: I built this. Free, no ads, no account needed to browse.
>
> **cragward.com** — parking pins, GPS approach trails, and offline downloads
> for western CO climbing areas (Unaweep, CO National Monument, Escalante,
> Independence Pass, Moab area). Save an area on wifi and the whole thing —
> map, routes, notes, photos — works in airplane mode at the crag.
>
> It's community-built: sign in to add parking/trails/notes/photos for crags
> you know. Looking for feedback from people who actually climb out here —
> what's missing, what's broken, what area should I add next?

### Draft C — one-liner (texts, DMs, gym card, anywhere)

> Free app for Western Slope climbing — parking, approach trails, and it works
> offline at the crag: **cragward.com**

### Posting notes
- **Post from your real account, reply to every comment fast** — the first two
  hours decide whether it lands. Early replies = algorithm + goodwill.
- Include **one good screenshot** (map with pins + an approach trail visible,
  or the offline download in action). Visual proof beats description.
- If someone asks "how's this different from Mountain Project": *"It's not
  trying to replace MP's route info — it's the getting-there part: parking,
  the trail in, and everything working with no signal."* Complement, not rival.
- **Access pushback will come** (someone will worry about publicizing crags).
  Answer honestly: contributions have a sensitive-access flag, everything is
  attributed/moderated, and it's the same public info as MP — plus better
  parking beta arguably *reduces* impact (fewer people wandering/trampling).

---

## 2. First-10-users game plan

Even without a climbing circle to share to, the post will bring people. What to
do with them:

1. **Watch Umami daily** (2 min): visitors, `sign_up`, `area_downloaded`,
   `contribution_created`, `share`. The number that matters most in week 1:
   **did anyone download an area?** That's the hero feature landing.
2. **Personally welcome every early contributor.** First note/pin someone adds
   → thank them in-app (note reply) or in the thread. Early contributors become
   your evangelists; there will be maybe 5 of them, treat them like gold.
3. **Ask one question of engaged users:** "what crag should I add next?" — the
   answers are your expansion roadmap (per the plan, contribution-gated).
4. **Log every bug/complaint** — that's the real backlog now, not our guesses.
5. **Cadence:** post → fix what breaks for a week → post the update in the same
   thread ("added X, fixed Y — thanks for the feedback"). Communities love
   seeing a responsive builder; it's the cheapest retention there is.

### What "it's working" looks like (evidence gates, from the plan)
- Week 1–2: a handful of sign-ups, ≥1 stranger downloads an area.
- Month 1: ≥1 contribution from someone you've never met; an area request.
- That's the signal to seed the next region and repeat the playbook.

---

## 3. Screenshot shot-list (for the posts)

1. Map zoomed to a known crag showing wall pins + a teal approach trail +
   parking pin. (The money shot — it shows the wedge in one image.)
2. "Save area offline" button mid-download or the "Saved ✓" state.
3. A route detail with grade, ascents, and a note/photo.
Take them on your phone in light mode, portrait. Crop the browser chrome, or
use the installed app for clean edges.
