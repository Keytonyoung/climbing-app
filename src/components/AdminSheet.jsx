// Read-only admin view of recent contributions across all shared tables.
// Rendered only when the signed-in user matches VITE_ADMIN_USER_ID (gated in
// App). This is the "tracked" half of moderation; revert/soft-delete lands later.

import { useEffect, useState } from 'react'
import { getRecentContributions, setContributionDeleted } from '../data/contributions'
import { routeRef } from '../data/routes'
import { useSheetDismiss } from '../lib/useSheetDismiss'

const KIND_LABEL = {
  note: 'Note',
  photo: 'Photo',
  tick: 'Ascent',
  pin: 'Pin',
  track: 'Trail',
  override: 'Wall move',
}

function fmt(d) {
  if (!d) return ''
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AdminSheet({ onPick, onClose }) {
  const dismiss = useSheetDismiss(onClose)
  const [rows, setRows] = useState(null) // null = loading
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let alive = true
    getRecentContributions().then((r) => alive && setRows(r))
    return () => {
      alive = false
    }
  }, [])

  // Soft-delete or restore, then reflect it in place (no full reload).
  async function toggleDeleted(row) {
    setBusyId(row.id)
    try {
      const next = !row.deletedAt
      await setContributionDeleted(row.kind, row.rawId, next)
      setRows((rs) =>
        rs.map((r) =>
          r.id === row.id ? { ...r, deletedAt: next ? new Date().toISOString() : null } : r
        )
      )
    } catch (e) {
      console.warn('moderation failed:', e.message || e)
    } finally {
      setBusyId(null)
    }
  }

  // Resolve a contribution's target to a (wallId, routeId) the map can open.
  function openTarget(target) {
    if (!target) return
    if (target.kind === 'route') {
      const ref = routeRef(target.id)
      if (ref) onPick(ref.wallId, target.id)
    } else if (target.kind === 'wall') {
      onPick(target.id, null)
    }
  }

  return (
    <div className="sheet" style={dismiss.style}>
      <div className="sheet-handle" {...dismiss.handleProps} />
      <header className="sheet-header">
        <h2>Recent contributions</h2>
        <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <p className="detail-desc muted">
        Everything added or changed across the app, newest first. Remove hides a
        contribution from everyone; Undo restores it. Nothing is permanently deleted.
      </p>

      {rows === null ? (
        <p className="detail-desc muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="detail-desc muted">No contributions yet.</p>
      ) : (
        <ul className="feed-list">
          {rows.map((r) => (
            <li key={r.id} className={`admin-row ${r.deletedAt ? 'is-removed' : ''}`}>
              <button
                className="feed-row"
                onClick={() => openTarget(r.target)}
                disabled={!r.target}
              >
                <span className="feed-line">
                  <span className="admin-kind">{KIND_LABEL[r.kind] || r.kind}</span>{' '}
                  <strong>{r.authorName}</strong> — {r.summary}
                </span>
                <span className="feed-sub">
                  {fmt(r.createdAt)}
                  {r.deletedAt ? ' · removed' : ''}
                </span>
              </button>
              <button
                className={`admin-action ${r.deletedAt ? 'restore' : 'remove'}`}
                onClick={() => toggleDeleted(r)}
                disabled={busyId === r.id}
              >
                {busyId === r.id ? '…' : r.deletedAt ? 'Undo' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
