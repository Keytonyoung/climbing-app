// App-wide auth state. Wrap <App/> in <AuthProvider>; components read it with
// useAuth(). Keeps the current user in sync with Supabase's session.

import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, getCachedUser, onAuthChange } from '../data/auth'

const AuthContext = createContext({ user: null, ready: false })

export function AuthProvider({ children }) {
  // Start from the cached identity SYNCHRONOUSLY (localStorage is sync), so a
  // cold start at a crag shows you signed in instantly. Reading the live
  // session can take seconds when the network is dead, and blocking on it left
  // a window where every edit control was hidden.
  const [user, setUser] = useState(getCachedUser)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    // Then reconcile with the real session in the background. The data layer
    // owns who the user is (see THE RULE in data/auth.js); this only mirrors
    // it, and must never end up stuck if that read goes wrong.
    getCurrentUser()
      .catch(() => getCachedUser())
      .then((u) => {
        if (!mounted) return
        setUser(u)
        setReady(true)
      })
    const unsub = onAuthChange((u) => {
      if (mounted) setUser(u)
    })
    return () => {
      mounted = false
      unsub()
    }
  }, [])

  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
