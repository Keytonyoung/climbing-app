// Bottom sheet for viewing a saved trail: name, length, both anchors (tap to
// zoom/open), notes, and Delete.

import { resolveAnchor, formatDistance } from '../data/tracks'

export default function TrackSheet({ track, pins, mine, onAnchorTap, onDelete, onClose }) {
  const coords = track.coordinates
  const start = resolveAnchor(track.start, pins, coords[0])
  const end = resolveAnchor(track.end, pins, coords[coords.length - 1])

  return (
    <div className="sheet">
      <div className="sheet-handle" />
      <header className="sheet-header">
        <div>
          <h2>{track.name || 'Unnamed trail'}</h2>
          <p className="sheet-path">{formatDistance(track.lengthMeters)} approach</p>
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      <div className="filter-group">
        <span className="filter-label">Route</span>
        <div className="anchor-row">
          <button className="anchor-link" onClick={() => onAnchorTap(track.start, coords[0])}>
            📍 {start.label}
          </button>
          <span className="anchor-arrow">→</span>
          <button
            className="anchor-link"
            onClick={() => onAnchorTap(track.end, coords[coords.length - 1])}
          >
            🧗 {end.label}
          </button>
        </div>
      </div>

      {track.notes && (
        <section className="detail-section">
          <h3>Notes</h3>
          <p className="detail-desc">{track.notes}</p>
        </section>
      )}

      <footer className="detail-footer">Recorded by {track.authorName || 'a climber'}</footer>

      {mine && (
        <div className="pin-actions">
          <button className="pin-delete" onClick={() => onDelete(track.id)}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
