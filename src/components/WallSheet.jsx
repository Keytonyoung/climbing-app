// Bottom sheet listing the routes on a tapped wall. Tap a route to open its
// detail view.

import NotesPhotos from './NotesPhotos'

const TYPE_LABELS = {
  sport: 'Sport',
  trad: 'Trad',
  toprope: 'Top-rope',
  boulder: 'Boulder',
  aid: 'Aid',
}

export default function WallSheet({ wall, tracks = [], onOpenTrack, onSelectRoute, onClose }) {
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
