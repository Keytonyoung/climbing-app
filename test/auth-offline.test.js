// @vitest-environment jsdom
//
// Locks down the offline-identity rule (see data/auth.js): the cached identity
// is authoritative and ONLY an explicit signOut() clears it. This bug reached a
// real crag twice — once because nothing persisted the user, and once because
// the guards trusted navigator.onLine, which reads TRUE on a one-bar connection
// where every request times out. These tests exist so it can't come back.
import { describe, it, expect, beforeEach, vi } from 'vitest'

let sessionUser = null
let getSessionImpl = null // override to simulate a rejecting / stalling refresh
let authCallback = null // the captured onAuthStateChange handler

vi.mock('../src/data/supabase.js', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: async () => {
        if (getSessionImpl) return getSessionImpl()
        return { data: { session: sessionUser ? { user: sessionUser } : null } }
      },
      onAuthStateChange: (cb) => {
        authCallback = cb
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      signOut: async () => {
        sessionUser = null
      },
    },
  },
}))

import { cacheUser, getCachedUser, getCurrentUser, onAuthChange, signOut } from '../src/data/auth'

function setOnline(v) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v })
}

const SOMEONE = { id: 'u1', email: 'cole@example.com', user_metadata: { display_name: 'Cole' } }

describe('offline auth persistence', () => {
  beforeEach(() => {
    sessionUser = null
    getSessionImpl = null
    setOnline(true)
    // Clear the module's internal signing-out flag (a successful sign-in does
    // it), then wipe the cache that event just wrote.
    onAuthChange(() => {})
    authCallback?.('SIGNED_IN', { user: SOMEONE })
    localStorage.clear()
  })

  it('round-trips the cached user', () => {
    cacheUser(SOMEONE)
    expect(getCachedUser()).toMatchObject({ id: 'u1', user_metadata: { display_name: 'Cole' } })
  })

  it('returns and caches the live session user when present', async () => {
    sessionUser = { id: 'u2', email: 'c@d.com', user_metadata: {} }
    const u = await getCurrentUser()
    expect(u.id).toBe('u2')
    expect(getCachedUser().id).toBe('u2') // cached as a side effect
  })

  it('stays signed in when fully offline with no live session', async () => {
    cacheUser({ id: 'u3', email: 'e@f.com', user_metadata: {} })
    sessionUser = null
    setOnline(false)
    expect((await getCurrentUser()).id).toBe('u3')
  })

  // THE CRAG BUG: one bar of signal, so navigator.onLine lies and says true,
  // but the token refresh can't complete. Must NOT read as a sign-out.
  it('stays signed in when navigator.onLine lies (one bar, no data)', async () => {
    cacheUser({ id: 'u4', email: 'g@h.com', user_metadata: {} })
    sessionUser = null
    setOnline(true) // the lie
    expect((await getCurrentUser()).id).toBe('u4')
  })

  it('survives a rejecting session read', async () => {
    cacheUser({ id: 'u5', email: 'i@j.com', user_metadata: {} })
    getSessionImpl = () => Promise.reject(new Error('network request failed'))
    expect((await getCurrentUser()).id).toBe('u5')
  })

  it('survives a stalling session read, so startup can never hang', async () => {
    cacheUser({ id: 'u6', email: 'k@l.com', user_metadata: {} })
    getSessionImpl = () => new Promise(() => {}) // never settles
    vi.useFakeTimers()
    const pending = getCurrentUser()
    await vi.advanceTimersByTimeAsync(5000)
    const u = await pending
    vi.useRealTimers()
    expect(u.id).toBe('u6')
  })

  it('returns null only when nothing was ever cached', async () => {
    sessionUser = null
    expect(await getCurrentUser()).toBeNull()
  })

  it('ignores a spurious SIGNED_OUT and keeps the identity', () => {
    cacheUser({ id: 'u7', email: 'm@n.com', user_metadata: {} })
    const seen = []
    onAuthChange((u) => seen.push(u))
    authCallback('SIGNED_OUT', null) // failed refresh on a dead connection
    expect(getCachedUser().id).toBe('u7') // cache intact
    expect(seen).toEqual([]) // UI never told to sign out
  })

  it('honors sign-out when the user actually asked for it', async () => {
    cacheUser({ id: 'u8', email: 'o@p.com', user_metadata: {} })
    const seen = []
    onAuthChange((u) => seen.push(u))
    await signOut()
    expect(getCachedUser()).toBeNull()
    authCallback('SIGNED_OUT', null)
    expect(seen).toEqual([null])
  })
})
