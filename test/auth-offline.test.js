// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Control what Supabase's getSession returns per test.
let sessionUser = null
vi.mock('../src/data/supabase.js', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { getSession: async () => ({ data: { session: sessionUser ? { user: sessionUser } : null } }) } },
}))

import { cacheUser, getCachedUser, getCurrentUser } from '../src/data/auth'

function setOnline(v) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v })
}

describe('offline auth persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionUser = null
    setOnline(true)
  })

  it('round-trips the cached user', () => {
    cacheUser({ id: 'u1', email: 'a@b.com', user_metadata: { display_name: 'Cole' } })
    expect(getCachedUser()).toMatchObject({ id: 'u1', user_metadata: { display_name: 'Cole' } })
    cacheUser(null)
    expect(getCachedUser()).toBeNull()
  })

  it('returns and caches the live session user when present', async () => {
    sessionUser = { id: 'u2', email: 'c@d.com', user_metadata: {} }
    const u = await getCurrentUser()
    expect(u.id).toBe('u2')
    expect(getCachedUser().id).toBe('u2') // got cached as a side effect
  })

  it('falls back to the cached user when offline with no live session', async () => {
    cacheUser({ id: 'u3', email: 'e@f.com', user_metadata: {} })
    sessionUser = null
    setOnline(false)
    const u = await getCurrentUser()
    expect(u.id).toBe('u3') // the crag case: still "signed in"
  })

  it('returns null when online with no session (genuinely signed out)', async () => {
    cacheUser({ id: 'u4', email: 'g@h.com', user_metadata: {} })
    sessionUser = null
    setOnline(true)
    expect(await getCurrentUser()).toBeNull()
  })
})
