// Supabase client — the shared-backend connection for multi-user v1.
// Part of the data layer (CLAUDE.md rule 2): feature modules (pins, tracks,
// notes) will import this; UI never does.
//
// Reads config from Vite env vars (see .env.example). The anon key is meant to
// be public — Row-Level Security in supabase/schema.sql is what protects data.
//
// NOTE: not yet wired into the running app. Until .env.local is filled in and
// the data modules are migrated (Stage A3), `isSupabaseConfigured` is false and
// the app keeps using local IndexedDB. This keeps the live site working while
// the backend is stood up.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// Only create a client when configured, so importing this module never throws
// in a fresh checkout with no .env.local.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
