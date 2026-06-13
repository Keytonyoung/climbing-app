// Sign-in / account bottom sheet. Two steps when signed out (email → code);
// shows account + sign out when signed in.

import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { sendMagicLink, signOut, displayName } from '../data/auth'

export default function AuthSheet({ onClose }) {
  const { user } = useAuth()
  const [step, setStep] = useState('email') // 'email' | 'sent'
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function send() {
    setBusy(true)
    setError(null)
    try {
      await sendMagicLink(email.trim())
      setStep('sent')
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet">
      <div className="sheet-handle" />
      <header className="sheet-header">
        <h2>{user ? 'Account' : 'Sign in to contribute'}</h2>
        <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
      </header>

      {user ? (
        <div className="auth-body">
          <p className="auth-who">Signed in as <strong>{displayName(user)}</strong></p>
          <p className="sheet-path">{user.email}</p>
          <button className="pin-delete" onClick={async () => { await signOut(); onClose() }}>
            Sign out
          </button>
        </div>
      ) : (
        <div className="auth-body">
          <p className="auth-intro">
            Anyone can browse. To add pins, trails, notes, and photos, sign in with
            your email — we'll send a sign-in link (no password).
          </p>

          {step === 'email' ? (
            <>
              <input
                className="pin-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="pin-save" disabled={busy || !email.includes('@')} onClick={send}>
                {busy ? 'Sending…' : 'Send sign-in link'}
              </button>
            </>
          ) : (
            <>
              <p className="auth-intro">
                Check <strong>{email}</strong> and tap the sign-in link. You can come
                back here once you're done — you'll be signed in automatically.
              </p>
              <button className="reset" onClick={() => { setStep('email'); setError(null) }}>
                Use a different email
              </button>
            </>
          )}

          {error && <p className="place-error">{error}</p>}
        </div>
      )}
    </div>
  )
}
