import {
  ROUTE_TYPES,
  YDS_MIN,
  YDS_MAX,
  V_MIN,
  V_MAX,
  DEFAULT_FILTER,
} from '../data/routes'
import { useSheetDismiss } from '../lib/useSheetDismiss'

const TYPE_LABELS = {
  sport: 'Sport',
  trad: 'Trad',
  toprope: 'Top-rope',
  boulder: 'Boulder',
  aid: 'Aid',
}

const ydsLabel = (n) => `5.${n}`
const vLabel = (n) => `V${n}`
const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)

export default function FilterPanel({ filter, onChange, counts, onClose }) {
  const dismiss = useSheetDismiss(onClose)
  const toggleType = (type) => {
    const types = filter.types.includes(type)
      ? filter.types.filter((t) => t !== type)
      : [...filter.types, type]
    onChange({ ...filter, types })
  }

  const setNum = (key, value) => onChange({ ...filter, [key]: Number(value) })

  const ropedOn = filter.types.some((t) => t !== 'boulder')
  const boulderOn = filter.types.includes('boulder')

  return (
    <div className="sheet" {...dismiss}>
      <div className="sheet-handle" />
      <header className="sheet-header">
        <h2>Filter routes</h2>
        <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="filter-panel">
      <div className="filter-group">
        <span className="filter-label">Type</span>
        <div className="chips">
          {ROUTE_TYPES.map((type) => (
            <button
              key={type}
              className={`chip ${filter.types.includes(type) ? 'on' : ''}`}
              onClick={() => toggleType(type)}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {ropedOn && (
        <div className="filter-group">
          <span className="filter-label">Roped grade (YDS)</span>
          <div className="range">
            <select value={filter.ydsMin} onChange={(e) => setNum('ydsMin', e.target.value)}>
              {range(YDS_MIN, YDS_MAX).map((n) => (
                <option key={n} value={n} disabled={n > filter.ydsMax}>
                  {ydsLabel(n)}
                </option>
              ))}
            </select>
            <span className="dash">to</span>
            <select value={filter.ydsMax} onChange={(e) => setNum('ydsMax', e.target.value)}>
              {range(YDS_MIN, YDS_MAX).map((n) => (
                <option key={n} value={n} disabled={n < filter.ydsMin}>
                  {ydsLabel(n)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {boulderOn && (
        <div className="filter-group">
          <span className="filter-label">Boulder grade (V)</span>
          <div className="range">
            <select value={filter.vMin} onChange={(e) => setNum('vMin', e.target.value)}>
              {range(V_MIN, V_MAX).map((n) => (
                <option key={n} value={n} disabled={n > filter.vMax}>
                  {vLabel(n)}
                </option>
              ))}
            </select>
            <span className="dash">to</span>
            <select value={filter.vMax} onChange={(e) => setNum('vMax', e.target.value)}>
              {range(V_MIN, V_MAX).map((n) => (
                <option key={n} value={n} disabled={n < filter.vMin}>
                  {vLabel(n)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="filter-footer">
        <span className="result-count">
          {counts.wallCount} walls · {counts.routeCount} routes
        </span>
        <button className="reset" onClick={() => onChange({ ...DEFAULT_FILTER })}>
          Reset
        </button>
      </div>
      </div>
    </div>
  )
}
