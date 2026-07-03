// Bottom sheet for a personal pin. Editable when it's yours (or new); read-only
// with attribution when it's a buddy's (RLS only lets you edit your own).

import Icon from './Icon'
import { useState } from 'react'
import { CATEGORIES, categoryLabel } from '../data/pins'
import { openDirections } from '../lib/directions'
import { useSheetDismiss } from '../lib/useSheetDismiss'

export default function PinEditSheet({ pin, isNew, mine, onSave, onDelete, onCancel }) {
  const [category, setCategory] = useState(pin.category)
  const [label, setLabel] = useState(pin.label || '')
  const [notes, setNotes] = useState(pin.notes || '')
  const [sensitive, setSensitive] = useState(!!pin.sensitive)

  const dismiss = useSheetDismiss(onCancel)
  const save = () => onSave({ ...pin, category, label: label.trim(), notes: notes.trim(), sensitive })
  const editable = isNew || mine

  if (!editable) {
    return (
      <div className="sheet" style={dismiss.style}>
        <div className="sheet-handle" {...dismiss.handleProps} />
        <header className="sheet-header">
          <h2>{pin.label || categoryLabel(pin.category)}</h2>
          <button className="sheet-close" onClick={onCancel} aria-label="Close">✕</button>
        </header>
        <div className="detail-badges">
          <span className="badge">{categoryLabel(pin.category)}</span>
        </div>
        {pin.sensitive && (
          <p className="sensitive-note">Sensitive access — please keep it low-key.</p>
        )}
        {pin.notes && <p className="detail-desc">{pin.notes}</p>}
        <button className="directions-btn" onClick={() => openDirections(pin.lat, pin.lng)}>
          <Icon name="directions" size={15} /> Directions
        </button>
        <footer className="detail-footer">Added by {pin.authorName || 'a climber'}</footer>
      </div>
    )
  }

  return (
    <div className="sheet" style={dismiss.style}>
      <div className="sheet-handle" {...dismiss.handleProps} />
      <header className="sheet-header">
        <h2>{isNew ? 'New pin' : 'Edit pin'}</h2>
        <button className="sheet-close" onClick={onCancel} aria-label="Cancel">
          ✕
        </button>
      </header>

      <div className="filter-group">
        <span className="filter-label">Category</span>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`chip ${category === c.key ? 'on' : ''}`}
              onClick={() => setCategory(c.key)}
            >
              <span className="chip-dot" style={{ background: c.color }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Label</span>
        <input
          className="pin-input"
          type="text"
          value={label}
          placeholder="e.g. Main lot, trail start…"
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">Notes</span>
        <textarea
          className="pin-textarea"
          value={notes}
          placeholder="Anything useful — gate code, 4WD only, hard to spot…"
          rows={3}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <label className="opt-in-row">
        <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} />
        <span>
          Sensitive access — keep it low-key. Mark this if broadcasting the parking or
          approach could threaten access to the crag.
        </span>
      </label>

      {!isNew && (
        <button className="directions-btn" onClick={() => openDirections(pin.lat, pin.lng)}>
          <Icon name="directions" size={15} /> Directions
        </button>
      )}

      <div className="pin-actions">
        {!isNew && (
          <button className="pin-delete" onClick={() => onDelete(pin.id)}>
            Delete
          </button>
        )}
        <button className="pin-save" onClick={save}>
          Save
        </button>
      </div>
    </div>
  )
}
