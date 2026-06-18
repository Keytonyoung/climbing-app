// Full detail view for a single route. Shown as a bottom sheet over the map.
// Only displays sourced data — never auto-generated safety info (CLAUDE.md §8).

import { useState } from 'react'
import NotesPhotos from './NotesPhotos'
import RouteLog from './RouteLog'
import { shareUrl, shareOrCopy } from '../lib/share'
import { useSheetDismiss } from '../lib/useSheetDismiss'

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
  const dismiss = useSheetDismiss(onClose)
  const [copied, setCopied] = useState(false)
  async function share() {
    const res = await shareOrCopy(shareUrl({ wallId: wall.id, routeId: route.id }), route.name)
    if (res === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="sheet" style={dismiss.style}>
      <div className="sheet-handle" {...dismiss.handleProps} />
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

      <button className="directions-btn" onClick={share}>
        {copied ? '✓ Link copied' : '🔗 Share route'}
      </button>

      <RouteLog route={route} wallId={wall.id} />

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
