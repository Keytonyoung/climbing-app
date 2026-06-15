// Bottom sheet listing the routes on a tapped wall. Tap a route to open its
// detail view.

import { useState } from 'react'
import NotesPhotos from './NotesPhotos'
import { openDirections } from '../lib/directions'
import { shareUrl, shareOrCopy } from '../lib/share'

const TYPE_LABELS = {
  sport: 'Sport',
  trad: 'Trad',
  toprope: 'Top-rope',
  boulder: 'Boulder',
  aid: 'Aid',
}

export default function WallSheet({
  wall,
  tracks = [],
  canEdit,
  onOpenTrack,
  onSelectRoute,
  onFixLocation,
  onResetLocation,
  onClose,
}) {
  const [copied, setCopied] = useState(false)
  async function share() {
    const res = await shareOrCopy(shareUrl({ wallId: wall.id }), wall.name)
    if (res === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="sheet">
      <div className="sheet-handle" />
      <header className="sheet-header">
        <div>
          <h2>{wall.name}</h2>
          <p className="sheet-path">{wall.path}</p>
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      <div className="sheet-actions">
        <button className="directions-btn" onClick={() => openDirections(wall.lat, wall.lng)}>
          🧭 Directions
        </button>
        <button className="directions-btn" onClick={share}>
          {copied ? '✓ Link copied' : '🔗 Share'}
        </button>
      </div>

      <div className="wall-location">
        {wall.moved ? (
          <span className="wall-moved">📍 Location corrected{wall.movedBy ? ` by ${wall.movedBy}` : ''}</span>
        ) : (
          <span className="wall-moved muted">📍 OpenBeta location</span>
        )}
        {canEdit && (
          <span className="wall-location-actions">
            <button className="link-btn" onClick={() => onFixLocation(wall)}>Fix location</button>
            {wall.moved && (
              <button className="link-btn" onClick={() => onResetLocation(wall.id)}>Reset</button>
            )}
          </span>
        )}
      </div>

      {tracks.length > 0 && (
        <div className="wall-tracks">
          {tracks.map((t) => (
            <button key={t.id} className="wall-track-row" onClick={() => onOpenTrack(t)}>
              🥾 {t.name || 'Approach trail'}
              <span className="route-chevron">›</span>
            </button>
          ))}
        </div>
      )}

      <NotesPhotos kind="wall" id={wall.id} />

      <p className="sheet-count">{wall.routes.length} routes</p>
      <ul className="route-list">
        {wall.routes.map((r) => (
          <li key={r.id}>
            <button className="route-row" onClick={() => onSelectRoute(r)}>
              <span className="route-name">{r.name}</span>
              <span className="route-grade">{r.grade || '—'}</span>
              <span className="route-type">{TYPE_LABELS[r.type] || r.type}</span>
              <span className="route-chevron">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
