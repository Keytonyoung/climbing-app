// Bottom sheet shown after recording stops: name the trail, add notes, and
// anchor BOTH ends to a pin or wall. Each picker pre-selects the nearest
// candidate; if nothing is close, it defaults to creating a parking pin at that
// endpoint so the trail is always anchored and the recording is never lost.

import { useState } from 'react'
import { formatDistance } from '../data/tracks'

// Distance within which we trust an existing anchor; beyond it, default to
// creating a pin at the endpoint. Walls have imprecise coords, so be generous.
const NEAR_THRESHOLD_M = 150

function defaultChoice(candidates) {
  const nearest = candidates[0]
  if (nearest && nearest.distance <= NEAR_THRESHOLD_M) {
    return { kind: nearest.kind, id: nearest.id }
  }
  return { create: true }
}

function AnchorPicker({ title, candidates, value, onChange }) {
  const isCreate = value?.create
  return (
    <div className="filter-group">
      <span className="filter-label">{title}</span>
      <div className="chips">
        {candidates.map((c) => {
          const on = !isCreate && value?.kind === c.kind && value?.id === c.id
          return (
            <button
              key={`${c.kind}-${c.id}`}
              className={`chip ${on ? 'on' : ''}`}
              onClick={() => onChange({ kind: c.kind, id: c.id })}
            >
              {c.label}
              <span className="chip-dist">
                {c.kind === 'wall' ? '🧗 ' : '📍 '}
                {formatDistance(c.distance)}
              </span>
            </button>
          )
        })}
        <button
          className={`chip ${isCreate ? 'on' : ''}`}
          onClick={() => onChange({ create: true })}
        >
          ＋ Parking pin here
        </button>
      </div>
    </div>
  )
}

export default function TrackSaveSheet({
  startCandidates,
  endCandidates,
  onSave,
  onDiscard,
}) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [start, setStart] = useState(() => defaultChoice(startCandidates))
  const [end, setEnd] = useState(() => defaultChoice(endCandidates))

  const save = () =>
    onSave({ name: name.trim(), notes: notes.trim(), start, end })

  return (
    <div className="sheet">
      <div className="sheet-handle" />
      <header className="sheet-header">
        <h2>Save trail</h2>
        <button className="sheet-close" onClick={onDiscard} aria-label="Discard">
          ✕
        </button>
      </header>

      <div className="filter-group">
        <span className="filter-label">Name</span>
        <input
          className="pin-input"
          type="text"
          value={name}
          placeholder="e.g. Approach to Juniper Wall"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <AnchorPicker
        title="Starts at"
        candidates={startCandidates}
        value={start}
        onChange={setStart}
      />
      <AnchorPicker
        title="Ends at"
        candidates={endCandidates}
        value={end}
        onChange={setEnd}
      />

      <div className="filter-group">
        <span className="filter-label">Notes</span>
        <textarea
          className="pin-textarea"
          value={notes}
          placeholder="Cairns at the fork, stay left, 10 min…"
          rows={2}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="pin-actions">
        <button className="pin-delete" onClick={onDiscard}>
          Discard
        </button>
        <button className="pin-save" onClick={save}>
          Save trail
        </button>
      </div>
    </div>
  )
}
