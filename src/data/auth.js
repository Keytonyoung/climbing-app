// Auth wrapper around Supabase (part of the data layer; UI goes through the
// AuthContext, not this directly). Passwordless magic-link sign-in: tap a link
// in the email and the app picks up the session on return.
//
// (We'd prefer in-app one-time codes — better for installed PWAs — but Supabase
// now requires custom SMTP to edit the email template that would show the code.
// Magic link works with the default email; revisit codes once SMTP is set up.)

import { supabase, isSupabaseConfigured } from './supabase'

// Where the magic link returns to — current origin + Vite base path. Works in
// both dev (localhost) and prod (GitHub Pages subpath). Must be allowlisted in
// Supabase: Authentication → URL Configuration → Redirect URLs.
function redirectTo() {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

/** Resolve a set of user ids to { id: display_name }. */
export async function getDisplayNames(ids) {
  const map = {}
  const unique = [...new Set(ids.filter(Boolean))]
  if (!isSupabaseConfigured || !unique.length) return map
  const { data } = await supabase.from('profiles').select('id, display_name').in('id', unique)
  for (const p of data || []) map[p.id] = p.display_name
  return map
}

/** Friendly name for a user (display_name, else the email's local part). */
export function displayName(user) {
  if (!user) return ''
  return user.user_metadata?.display_name || user.email?.split('@')[0] || 'Climber'
}

// --- Offline-durable identity --------------------------------------------
//
// THE RULE: the cached identity is authoritative, and ONLY an explicit
// signOut() may clear it.
//
// Do NOT gate this on navigator.onLine. That flag reports whether a network
// INTERFACE exists, not whether the internet works. At a crag with one bar (or
// "SOS") it reads TRUE while every request times out — so a token refresh
// fails, Supabase fires SIGNED_OUT, and an onLine-based guard never trips. That
// logged Cole out mid-session AND wiped the cache, so even switching to
// airplane mode couldn't recover it. Real bug, found at a real crag.
//
// Deliberate tradeoff: a stale session lingering is a minor annoyance with an
// obvious fix (Sign out → sign in again). A false sign-out at a crag destroys
// the entire point of the app. Identity favors the climber.
const USER_CACHE_KEY = 'cachedUser'

// Set only by signOut(); the one thing allowed to evict the cached identity.
let signingOut = false

export function cacheUser(user) {
  try {
    if (user) {
      const { id, email, user_metadata } = user
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ id, email, user_metadata }))
    } else {
      localStorage.removeItem(USER_CACHE_KEY)
    }
  } catch {
    /* storage may be unavailable; non-fatal */
  }
}

export function getCachedUser() {
  try {
    const s = localStorage.getItem(USER_CACHE_KEY)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

/**
 * Read the live session without ever hanging or throwing. With no usable
 * network, getSession() may attempt a token refresh that stalls or rejects —
 * an unhandled rejection here used to leave the app stuck with no user at all.
 */
async function liveSession(timeoutMs = 4000) {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])
    return result?.data?.session ?? null
  } catch {
    return null
  }
}

/** Current signed-in user (or null). Falls back to the cached identity whenever
 *  there's no live session, so author stamping and every edit control keep
 *  working with no signal (see THE RULE above). */
export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null
  const user = (await liveSession())?.user ?? null
  if (user) {
    cacheUser(user)
    return user
  }
  // No live session. We cannot distinguish "genuinely signed out" from "the
  // network is lying to us", so we keep the climber signed in.
  return getCachedUser()
}

/** Subscribe to sign-in/out. Returns an unsubscribe fn. */
export function onAuthChange(cb) {
  if (!isSupabaseConfigured) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null
    if (user) {
      signingOut = false
      cacheUser(user)
      cb(user)
      return
    }
    // A null user only counts when WE asked to sign out. Anything else is a
    // failed refresh on a dead connection — never evict the identity for that.
    if (signingOut) {
      cacheUser(null)
      cb(null)
    }
  })
  return () => data.subscription.unsubscribe()
}

/** Email a magic sign-in link (creating the account if new). */
export async function sendMagicLink(email) {
  if (!isSupabaseConfigured) throw new Error('Backend not configured')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo(), shouldCreateUser: true },
  })
  if (error) throw error
}

/** Explicit, user-initiated sign-out — the only path that clears the identity. */
export async function signOut() {
  signingOut = true
  cacheUser(null)
  if (isSupabaseConfigured) await supabase.auth.signOut()
}

/** Set the current user's display name (session metadata + shared profile row,
 *  so it shows on the account button and on everyone else's attribution). */
export async function updateDisplayName(name) {
  if (!isSupabaseConfigured) throw new Error('Backend not configured')
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('Name cannot be empty')
  const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } })
  if (error) throw error
  const { data } = await supabase.auth.getUser()
  if (data.user) await supabase.from('profiles').update({ display_name: trimmed }).eq('id', data.user.id)
}

/** Read the current user's marketing-email opt-in (defaults false). */
export async function getMarketingOptIn() {
  if (!isSupabaseConfigured) return false
  const user = await getCurrentUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('marketing_opt_in').eq('id', user.id).single()
  return !!data?.marketing_opt_in
}

/** Set the current user's marketing-email opt-in (consented, separate from the
 *  transactional auth email — see growth plan §11e). */
export async function setMarketingOptIn(optIn) {
  if (!isSupabaseConfigured) throw new Error('Backend not configured')
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in first.')
  const { error } = await supabase.from('profiles').update({ marketing_opt_in: !!optIn }).eq('id', user.id)
  if (error) throw error
}
