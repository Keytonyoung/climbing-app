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

/** Current signed-in user (or null). */
export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user ?? null
}

/** Subscribe to sign-in/out. Returns an unsubscribe fn. */
export function onAuthChange(cb) {
  if (!isSupabaseConfigured) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) =>
    cb(session?.user ?? null)
  )
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

export async function signOut() {
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
