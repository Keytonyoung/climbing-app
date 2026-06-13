// Full detail view for a single route. Shown as a bottom sheet over the map.
// Only displays sourced data — never auto-generated safety info (CLAUDE.md §8).

import NotesPhotos from './NotesPhotos'

const TYPE_LABELS = {
  sport: 'Sport',
  trad: 'Trad',
  toprope: 'Top-rope',
  boulder: 'Boulder',
  aid: 'Aid',
}

const SOURCE_LABELS = {
  openbeta: 'OpenBeta (CC0)',
  cole: 'Personal note',
}

export default function RouteDetail({ route, wall, onBack, onClose }) {
  const scale = route.type === 'boulder' ? 'V-scale' : 'YDS'

  return (
    <div className="sheet">
      <div className="sheet-handle" />
      <header className="sheet-header">
        <button className="sheet-back" onClick={onBack}>
          ‹ {wall.name}
        </button>
        <button className="sheet-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      <h2 className="detail-name">{route.name}</h2>

      <div className="detail-badges">
        <span className="badge grade-badge">{route.grade || 'Ungraded'}</span>
        <span className="badge">{TYPE_LABELS[route.type] || route.type}</span>
        {route.grade && <span className="badge-scale">{scale}</span>}
      </div>

      {route.description && (
        <section className="detail-section">
          <h3>Description</h3>
          <p className="detail-desc">{route.description}</p>
        </section>
      )}

      <NotesPhotos kind="route" id={route.id} />

      <section className="detail-section">
        <h3>Location</h3>
        <p className="detail-loc">{wall.path}</p>
      </section>

      <footer className="detail-footer">
        <span>Source: {SOURCE_LABELS[route.source] || route.source}</span>
        <p className="detail-disclaimer">
          Grades and route info are community-sourced. Verify conditions and
          protection yourself before climbing.
        </p>
      </footer>
    </div>
  )
}
