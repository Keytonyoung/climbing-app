// Sign-in / account bottom sheet. Two steps when signed out (email → code);
// shows account + sign out when signed in.

import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { sendMagicLink, signOut, displayName, updateDisplayName } from '../data/auth'
import { useSheetDismiss } from '../lib/useSheetDismiss'

export default function AuthSheet({ onClose, onShowHelp }) {
  const { user } = useAuth()
  const dismiss = useSheetDismiss(onClose)
  const [step, setStep] = useState('email') // 'email' | 'sent'
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savedName, setSavedName] = useState(false)

  useEffect(() => {
    if (user) setName(displayName(user))
  }, [user])

  async function saveName() {
    setSavingName(true)
    setError(null)
    try {
      await updateDisplayName(name)
      setSavedName(true)
      setTimeout(() => setSavedName(false), 2000)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setSavingName(false)
    }
  }

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
    <div className="sheet" style={dismiss.style}>
      <div className="sheet-handle" {...dismiss.handleProps} />
      <header className="sheet-header">
        <h2>{user ? 'Account' : 'Sign in to contribute'}</h2>
        <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
      </header>

      {user ? (
        <div className="auth-body">
          <p className="sheet-path">{user.email}</p>
          <div className="filter-group">
            <span className="filter-label">Display name (how buddies see you)</span>
            <input
              className="pin-input"
              type="text"
              value={name}
              placeholder="Your name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button
            className="pin-save"
            disabled={savingName || !name.trim() || name.trim() === displayName(user)}
            onClick={saveName}
          >
            {savedName ? 'Saved ✓' : savingName ? 'Saving…' : 'Save name'}
          </button>
          <button className="reset" onClick={async () => { await signOut(); onClose() }}>
            Sign out
          </button>
          {error && <p className="place-error">{error}</p>}
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
                Check <strong>{email}</strong> and tap the sign-in link (check spam too).
                Open it on this device; you'll be signed in automatically when you return.
              </p>
              <button className="pin-save" disabled={busy} onClick={send}>
                {busy ? 'Sending…' : 'Resend link'}
              </button>
              <button className="reset" onClick={() => { setStep('email'); setError(null) }}>
                Use a different email
              </button>
            </>
          )}

          {error && <p className="place-error">{error}</p>}
        </div>
      )}

      <footer className="auth-footer">
        <button className="link-btn" onClick={onShowHelp}>Help &amp; safety</button>
        <a className="link-btn" href="mailto:keytonyoung@gmail.com?subject=Western%20Slope%20Climbing%20feedback">
          Send feedback
        </a>
      </footer>
    </div>
  )
}
