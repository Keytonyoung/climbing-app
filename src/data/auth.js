// Auth wrapper around Supabase (part of the data layer; UI goes through the
// AuthContext, not this directly). Passwordless email one-time codes — chosen
// over magic links because code entry stays inside the installed PWA instead of
// bouncing the user out to a browser tab and losing the session.

import { supabase, isSupabaseConfigured } from './supabase'

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

/** Email a 6-digit sign-in code (creating the account if new). */
export async function sendEmailCode(email) {
  if (!isSupabaseConfigured) throw new Error('Backend not configured')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) throw error
}

/** Verify the emailed code and start a session. */
export async function verifyEmailCode(email, token) {
  if (!isSupabaseConfigured) throw new Error('Backend not configured')
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
}

export async function signOut() {
  if (isSupabaseConfigured) await supabase.auth.signOut()
}
