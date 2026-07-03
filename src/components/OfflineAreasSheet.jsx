// Saved offline areas: what you have, how fresh it is, one-tap update, and a
// loud warning when the browser evicted the offline caches. Offline you can
// SEE is offline you can trust — the app's whole promise depends on it.

import Icon from './Icon'
import { useSheetDismiss } from '../lib/useSheetDismiss'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function OfflineAreasSheet({
  areas,
  dl,
  dlLabel,
  health,
  onSaveCurrent,
  onRedownload,
  onDelete,
  onClose,
}) {
  const dismiss = useSheetDismiss(onClose)

  return (
    <div className="sheet" style={dismiss.style}>
      <div className="sheet-handle" {...dismiss.handleProps} />
      <header className="sheet-header">
        <h2>Offline areas</h2>
        <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
      </header>

      {health?.evicted && (
        <p className="sensitive-note">
          Your phone cleared the saved offline maps to free space. Tap Update on the
          areas you need before your next trip — and keep the app installed so it
          happens less.
        </p>
      )}

      <p className="detail-desc muted">
        A saved area works fully in airplane mode — map, routes, notes, and photos.
        Update an area on wifi to pick up new beta.
      </p>

      <ul className="area-list">
        {areas.map((a) => (
          <li key={a.id} className="area-row">
            <div className="area-info">
              <span className="area-name">{a.name}</span>
              <span className="area-sub">
                Saved {fmtDate(a.savedAt)} · {a.walls} wall{a.walls === 1 ? '' : 's'}
                {a.photos > 0 ? ` · ${a.photos} photo${a.photos === 1 ? '' : 's'}` : ''}
              </span>
            </div>
            <button
              className="area-update"
              disabled={dl?.running}
              onClick={() => onRedownload(a)}
            >
              Update
            </button>
            <button className="note-delete" disabled={dl?.running} onClick={() => onDelete(a.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <button className="pin-save" disabled={dl?.running} onClick={onSaveCurrent}>
        <Icon name="download" size={15} />{' '}
        {dl ? dlLabel : 'Save current map view offline'}
      </button>
    </div>
  )
}
