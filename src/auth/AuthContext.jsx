// App-wide auth state. Wrap <App/> in <AuthProvider>; components read it with
// useAuth(). Keeps the current user in sync with Supabase's session.

import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, onAuthChange, cacheUser } from '../data/auth'

const AuthContext = createContext({ user: null, ready: false })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    getCurrentUser().then((u) => {
      if (!mounted) return
      setUser(u)
      setReady(true)
    })
    const unsub = onAuthChange((u) => {
      if (!mounted) return
      // A dropped-signal token refresh fires a spurious SIGNED_OUT; ignore it
      // while offline so the user stays signed in and can keep editing.
      if (!u && typeof navigator !== 'undefined' && !navigator.onLine) return
      cacheUser(u)
      setUser(u)
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
