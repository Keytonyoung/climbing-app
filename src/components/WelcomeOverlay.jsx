// First-run welcome: a plain safety disclaimer (required — this app guides people
// to cliffs) plus a few orientation tips. Shown once; acknowledgement is stored
// in localStorage. UI never talks to storage elsewhere, but this is a one-off
// presentational flag, not app data.

export default function WelcomeOverlay({ onDismiss }) {
  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        <h1 className="welcome-title">Western Slope Climbing</h1>
        <p className="welcome-tagline">Find the wall. Share the beta.</p>

        <ul className="welcome-tips">
          <li><strong>Tap a wall</strong> to see its routes, notes, and photos.</li>
          <li><strong>Sign in</strong> to add parking pins, approach trails, notes & photos.</li>
          <li><strong>🧭 Directions</strong> opens your maps app to a pin or wall.</li>
          <li><strong>Save area offline</strong> before you lose signal at the crag.</li>
        </ul>

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
