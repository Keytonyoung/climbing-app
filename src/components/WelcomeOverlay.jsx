// First-run welcome: a plain safety disclaimer (required — this app guides people
// to cliffs) plus a few orientation tips. Shown once; acknowledgement is stored
// in localStorage. UI never talks to storage elsewhere, but this is a one-off
// presentational flag, not app data.

import { isStandalone } from '../lib/install'

export default function WelcomeOverlay({ onDismiss, onInstall }) {
  const showInstall = !isStandalone()

  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        <h1 className="welcome-title">Cragward</h1>
        <p className="welcome-tagline">Find the wall, climb offline.</p>

        <div className="welcome-mission">
          <strong>Built by climbers, for the people who actually go there.</strong>{' '}
          Independent, and put together by the locals who know these crags — not a
          product from some outdoor conglomerate. Cragward gets you <em>to</em> the
          wall — parking, the approach, the stuff that never made the guidebook — and
          keeps working when your signal doesn't. Every crag in here is better because
          someone added what they knew. Add yours.
        </div>

        <ul className="welcome-tips">
          <li><strong>Tap a wall</strong> for its routes, approach, notes, and photos.</li>
          <li><strong>Save area offline</strong> → the whole crag works in airplane mode.</li>
          <li><strong>Sign in to add beta</strong> — parking, trails, notes, photos; it syncs to everyone.</li>
          <li><strong>Fix a location</strong> if a wall's pin is off — help clean up the map.</li>
        </ul>

        {showInstall && (
          <div className="welcome-install">
            <strong>Put Cragward on your home screen</strong>
            <p>
              It opens like a real app, and your downloaded areas stay put. Takes about
              ten seconds — we'll walk you through it.
            </p>
            <button className="welcome-install-btn" onClick={onInstall}>
              Show me how
            </button>
          </div>
        )}

        <div className="welcome-disclaimer">
          <strong>Climb at your own risk.</strong> Route info, grades, and locations are
          community-sourced and may be wrong or incomplete. This app does not assess
          safety — verify anchors, gear, conditions, and the approach yourself. Rock
          climbing is dangerous and can result in serious injury or death.
        </div>

        <button className="welcome-btn" onClick={onDismiss}>
          I understand — let's climb
        </button>
      </div>
    </div>
  )
}
