// Bottom sheet for a personal pin. Editable when it's yours (or new); read-only
// with attribution when it's a buddy's (RLS only lets you edit your own).

import { useState } from 'react'
import { CATEGORIES, categoryLabel } from '../data/pins'

export default function PinEditSheet({ pin, isNew, mine, onSave, onDelete, onCancel }) {
  const [category, setCategory] = useState(pin.category)
  const [label, setLabel] = useState(pin.label || '')
  const [notes, setNotes] = useState(pin.notes || '')

  const save = () => onSave({ ...pin, category, label: label.trim(), notes: notes.trim() })
  const editable = isNew || mine

  if (!editable) {
    return (
      <div className="sheet">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2>{pin.label || categoryLabel(pin.category)}</h2>
          <button className="sheet-close" onClick={onCancel} aria-label="Close">✕</button>
        </header>
        <div className="detail-badges">
          <span className="badge">{categoryLabel(pin.category)}</span>
        </div>
        {pin.notes && <p className="detail-desc">{pin.notes}</p>}
        <footer className="detail-footer">Added by {pin.authorName || 'a climber'}</footer>
      </div>
    )
  }

  return (
    <div className="sheet">
      <div className="sheet-handle" />
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
