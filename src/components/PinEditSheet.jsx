// Bottom sheet for creating or editing a personal pin. Reuses the .sheet CSS
// from the wall/route sheets.

import { useState } from 'react'
import { CATEGORIES } from '../data/pins'

export default function PinEditSheet({ pin, isNew, onSave, onDelete, onCancel }) {
  const [category, setCategory] = useState(pin.category)
  const [label, setLabel] = useState(pin.label || '')
  const [notes, setNotes] = useState(pin.notes || '')

  const save = () => onSave({ ...pin, category, label: label.trim(), notes: notes.trim() })

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
