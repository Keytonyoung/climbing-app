// First-run welcome: a plain safety disclaimer (required — this app guides people
// to cliffs) plus a few orientation tips. Shown once; acknowledgement is stored
// in localStorage. UI never talks to storage elsewhere, but this is a one-off
// presentational flag, not app data.

// Already running as an installed app? Then skip the install tip.
function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

// iPhone/iPad (incl. iPadOS, which reports as Mac with touch).
function isIOS() {
  const ua = navigator.userAgent
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export default function WelcomeOverlay({ onDismiss }) {
  const showInstall = !isStandalone()
  const ios = isIOS()

  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        <h1 className="welcome-title">Western Slope Climbing</h1>
        <p className="welcome-tagline">Made by climbers, for climbers.</p>

        <div className="welcome-mission">
          We're building the best climbing database out there — and you're part of it.
          Log your climbs, fix wall locations, and drop beta (parking, approach trails,
          notes, photos). Every contribution makes it better for the next climber.
        </div>

        <ul className="welcome-tips">
          <li><strong>Tap a wall</strong> to see its routes, notes, and photos.</li>
          <li><strong>Sign in</strong> to contribute — it all syncs to everyone.</li>
          <li><strong>📍 Fix location</strong> if a wall's pin is off — help clean up the map.</li>
          <li><strong>Save area offline</strong> before you lose signal at the crag.</li>
        </ul>

        {showInstall && (
          <div className="welcome-install">
            <strong>📲 Install it for the full experience</strong>
            {ios ? (
              <p>
                In <strong>Safari</strong>, tap the Share button (the box with an ↑) at the
                bottom, then <strong>Add to Home Screen</strong>.
              </p>
            ) : (
              <p>
                In <strong>Chrome</strong>, tap the <strong>⋮</strong> menu (top right), then
                <strong> Install app</strong> (or Add to Home Screen).
              </p>
            )}
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
