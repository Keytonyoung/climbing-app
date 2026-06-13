// Sign-in / account bottom sheet. Two steps when signed out (email → code);
// shows account + sign out when signed in.

import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { sendEmailCode, verifyEmailCode, signOut, displayName } from '../data/auth'

export default function AuthSheet({ onClose }) {
  const { user } = useAuth()
  const [step, setStep] = useState('email') // 'email' | 'code'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function send() {
    setBusy(true)
    setError(null)
    try {
      await sendEmailCode(email.trim())
      setStep('code')
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    setBusy(true)
    setError(null)
    try {
      await verifyEmailCode(email.trim(), code.trim())
      onClose() // signed in — AuthContext updates via the listener
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
            your email — we'll send a one-time code (no password).
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
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </>
          ) : (
            <>
              <p className="auth-intro">Enter the 6-digit code sent to {email}.</p>
              <input
                className="pin-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button className="pin-save" disabled={busy || code.trim().length < 6} onClick={verify}>
                {busy ? 'Verifying…' : 'Verify & sign in'}
              </button>
              <button className="reset" onClick={() => { setStep('email'); setCode(''); setError(null) }}>
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
