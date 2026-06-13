# Stage A1 — Stand up Supabase (runbook)

This is the one part of the backend only **Cole** can do (it needs your account).
Follow these steps and we'll wire the app to it together. ~15 minutes.

## 1. Create the project
1. Go to **https://supabase.com** → sign up (GitHub login is easiest).
2. **New project.** Name: `climbing-app`. Pick a strong database password (save it
   in your password manager). Region: **West US** (closest to Colorado).
3. Choose the **Free** plan for now (we flip to Pro before sharing widely / 6/20).
4. Wait ~2 min for it to provision.

## 2. Build the database
1. Left sidebar → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repo, copy the whole thing, paste it in.
3. Click **Run**. You should see "Success" — this creates every table, the security
   rules, and the photo storage bucket.
4. Sanity check: sidebar → **Table Editor** should now list `profiles`, `pins`,
   `tracks`, `notes`, `photos`.

## 3. Turn on the login method
1. Sidebar → **Authentication** → **Providers** (or **Sign In / Up**).
2. Make sure **Email** is enabled. We'll use magic links / OTP (no passwords).
3. (Invite links for buddies get built in the app during A2 — nothing to do here yet.)

## 4. Grab the keys for the app
1. Sidebar → **Project Settings** → **API**.
2. Copy the **Project URL** and the **anon public** key.
3. In the repo, copy `.env.example` to `.env.local` and paste both values in:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   (`.env.local` is gitignored — these never get committed. The anon key is safe in a
   frontend anyway; the SQL security rules are what protect the data.)

## 5. Tell Claude you're done
Say **"Supabase is up"** (you do NOT need to share the keys — they live only in your
`.env.local`). Then we continue with **A2 (auth + invite links)** and **A3 (wire the
data layer to the backend)**.

---

### Already prepared in the repo (no action needed)
- `@supabase/supabase-js` installed.
- `src/data/supabase.js` — the client (reads your `.env.local`; stays inert until configured).
- `supabase/schema.sql` — the database (step 2).
- `.env.example` — the template (step 4).

### When to flip to Pro (~$25/mo)
Before you share with more than a couple people / before real photo uploads / by 6/20.
Free tier is fine for building this weekend, but a free project **sleeps after ~7 idle
days** (data is preserved — one click to restore). See `docs/v1-multiuser-plan.md`.
