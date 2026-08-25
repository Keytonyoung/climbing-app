// "Put Cragward on your home screen" — the walkthrough. Installing was the
// single biggest drop-off Cole saw when showing the app to people, so this
// meets each platform where it actually is instead of one generic paragraph:
//   android      → the browser's own one-tap install dialog
//   ios-safari   → illustrated Share → Add to Home Screen steps
//   ios-other    → tell them to switch to Safari FIRST (the silent killer)
//   desktop      → one-tap if offered, else the address-bar install icon

import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useSheetDismiss } from '../lib/useSheetDismiss'
import { canPromptInstall, promptInstall, getPlatform, onInstallChange } from '../lib/install'

function Steps({ children }) {
  return <ol className="install-steps">{children}</ol>
}

function Step({ n, children }) {
  return (
    <li>
      <span className="step-num">{n}</span>
      <span className="step-text">{children}</span>
    </li>
  )
}

export default function InstallGuide({ onClose }) {
  const dismiss = useSheetDismiss(onClose)
  const platform = getPlatform()
  const [canPrompt, setCanPrompt] = useState(canPromptInstall)
  const [result, setResult] = useState(null)

  // The install-availability event can land after this sheet is already open.
  useEffect(() => onInstallChange(() => setCanPrompt(canPromptInstall())), [])

  async function install() {
    const outcome = await promptInstall()
    setResult(outcome)
  }

  return (
    <div className="sheet" style={dismiss.style}>
      <div className="sheet-handle" {...dismiss.handleProps} />
      <header className="sheet-header">
        <h2>Add to your home screen</h2>
        <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
      </header>

      <p className="detail-desc muted">
        Installed, Cragward opens like a real app — full screen, and your downloaded
        areas are far less likely to be cleared by the phone.
      </p>

      {/* One tap where the browser supports it (Android Chrome, most desktops). */}
      {canPrompt && (
        <>
          <button className="pin-save install-cta" onClick={install}>
            <Icon name="download" size={16} /> Install Cragward
          </button>
          {result === 'dismissed' && (
            <p className="detail-desc muted">
              No problem — tap Install again whenever you're ready.
            </p>
          )}
        </>
      )}

      {!canPrompt && platform === 'ios-safari' && (
        <Steps>
          <Step n="1">
            Tap the <strong>Share</strong> button{' '}
            <span className="inline-glyph"><Icon name="ios-share" size={15} /></span> at the
            bottom of the screen.
          </Step>
          <Step n="2">
            Scroll down the list and tap <strong>Add to Home Screen</strong>.
          </Step>
          <Step n="3">
            Tap <strong>Add</strong> — Cragward lands on your home screen like any other app.
          </Step>
        </Steps>
      )}

      {!canPrompt && platform === 'ios-other' && (
        <>
          <p className="sensitive-note">
            On iPhone, adding to the home screen only works in <strong>Safari</strong>.
            You're in a different browser right now.
          </p>
          <Steps>
            <Step n="1">
              Open <strong>Safari</strong> and go to <strong>cragward.com</strong>.
            </Step>
            <Step n="2">
              Tap the <strong>Share</strong> button{' '}
              <span className="inline-glyph"><Icon name="ios-share" size={15} /></span> at the
              bottom.
            </Step>
            <Step n="3">
              Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
            </Step>
          </Steps>
        </>
      )}

      {!canPrompt && platform === 'android' && (
        <Steps>
          <Step n="1">
            Tap the <strong>menu</strong>{' '}
            <span className="inline-glyph"><Icon name="menu-dots" size={15} /></span> at the top
            right of your browser.
          </Step>
          <Step n="2">
            Tap <strong>Install app</strong> (some browsers call it Add to Home screen).
          </Step>
          <Step n="3">Confirm — Cragward appears with your other apps.</Step>
        </Steps>
      )}

      {!canPrompt && platform === 'desktop' && (
        <Steps>
          <Step n="1">
            Look for the <strong>install icon</strong> at the right end of the address bar.
          </Step>
          <Step n="2">Click it, then click <strong>Install</strong>.</Step>
        </Steps>
      )}

      <button className="reset" onClick={onClose}>Done</button>
    </div>
  )
}
