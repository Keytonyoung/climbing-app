// Search walls and routes by name; tap a result to open it on the map.

import { useEffect, useRef, useState } from 'react'
import { searchWallsAndRoutes } from '../data/routes'

export default function SearchSheet({ onPick, onClose }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const results = searchWallsAndRoutes(q)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="sheet search-sheet">
      <div className="sheet-handle" />
      <header className="sheet-header">
        <input
          ref={inputRef}
          className="pin-input"
          type="search"
          placeholder="Search walls and routes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
      </header>

      {q.trim().length >= 2 && results.length === 0 && (
        <p className="detail-desc muted">No matches.</p>
      )}

      <ul className="route-list">
        {results.map((r) => (
          <li key={`${r.kind}:${r.routeId || r.wallId}`}>
            <button className="route-row" onClick={() => onPick(r)}>
              <span className="route-name">{r.title}</span>
              <span className="route-type">{r.kind}</span>
              <span className="route-chevron">›</span>
            </button>
            <p className="search-sub">{r.subtitle}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
