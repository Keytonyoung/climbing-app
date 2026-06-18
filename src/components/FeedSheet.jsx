// Activity feed of recent logged ascents. "Everyone" = the social feed;
// "You" = your personal logbook. Tap an entry to open that route.

import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getRecentTicks, STYLE_LABELS } from '../data/ticks'
import { routeRef } from '../data/routes'
import { useSheetDismiss } from '../lib/useSheetDismiss'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function FeedSheet({ initialMode = 'all', onPick, onClose }) {
  const { user } = useAuth()
  const dismiss = useSheetDismiss(onClose)
  const [mode, setMode] = useState(initialMode) // 'all' | 'mine'
  const [ticks, setTicks] = useState(null) // null = loading

  useEffect(() => {
    let alive = true
    setTicks(null)
    getRecentTicks({ mine: mode === 'mine', userId: user?.id }).then((t) => alive && setTicks(t))
    return () => {
      alive = false
    }
  }, [mode, user])

  return (
    <div className="sheet" style={dismiss.style}>
      <div className="sheet-handle" {...dismiss.handleProps} />
      <header className="sheet-header">
        <h2>{mode === 'mine' ? 'My logbook' : 'Activity'}</h2>
        <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
      </header>

      {user && (
        <div className="chips feed-tabs">
          <button className={`chip ${mode === 'all' ? 'on' : ''}`} onClick={() => setMode('all')}>
            Everyone
          </button>
          <button className={`chip ${mode === 'mine' ? 'on' : ''}`} onClick={() => setMode('mine')}>
            You
          </button>
        </div>
      )}

      {ticks === null ? (
        <p className="detail-desc muted">Loading…</p>
      ) : ticks.length === 0 ? (
        <p className="detail-desc muted">
          {mode === 'mine'
            ? "You haven't logged any climbs yet — open a route and tap “I climbed this.”"
            : 'No ascents logged yet. Be the first!'}
        </p>
      ) : (
        <ul className="feed-list">
          {ticks.map((t) => {
            const ref = routeRef(t.routeId)
            return (
              <li key={t.id}>
                <button
                  className="feed-row"
                  onClick={() => ref && onPick(ref.wallId, t.routeId)}
                  disabled={!ref}
                >
                  <span className="feed-line">
                    <strong>{t.authorName}</strong> climbed{' '}
                    <strong>{ref ? ref.routeName : 'a route'}</strong>
                    {ref?.grade ? ` (${ref.grade})` : ''}
                  </span>
                  <span className="feed-sub">
                    {ref ? ref.wallName : ''}
                    {t.style ? ` · ${STYLE_LABELS[t.style] || t.style}` : ''} ·{' '}
                    {fmtDate(t.climbedOn || t.createdAt)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
