// App-wide auth state. Wrap <App/> in <AuthProvider>; components read it with
// useAuth(). Keeps the current user in sync with Supabase's session.

import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, onAuthChange } from '../data/auth'

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
    const unsub = onAuthChange((u) => mounted && setUser(u))
    return () => {
      mounted = false
      unsub()
    }
  }, [])

  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
