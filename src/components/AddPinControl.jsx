// The "add a pin" banner (shown below the top bar when adding). Lets Cole pick a
// category and choose how to place the pin: at his GPS location, or by tapping
// the map. App owns the actual marker/placement; this is the chooser UI.

import { CATEGORIES } from '../data/pins'

export default function AddPinControl({
  category,
  onCategory,
  onUseLocation,
  onTapMode,
  armed,
  onCancel,
  geoError,
}) {
  return (
    <div className="filter-panel">
      <div className="filter-group">
        <span className="filter-label">New pin — category</span>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`chip ${category === c.key ? 'on' : ''}`}
              onClick={() => onCategory(c.key)}
            >
              <span className="chip-dot" style={{ background: c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {armed ? (
        <div className="place-hint">
          <span>Tap the map to drop the pin (drag to adjust).</span>
          <button className="reset" onClick={onCancel}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="place-actions">
          <button className="place-btn primary" onClick={onUseLocation}>
            📍 Use my location
          </button>
          <button className="place-btn" onClick={onTapMode}>
            👆 Tap the map
          </button>
        </div>
      )}

      {geoError && <p className="place-error">{geoError}</p>}
    </div>
  )
}
