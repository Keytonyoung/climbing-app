// Logged-ascents block for a route: tick count, recent climbers, and a "log it"
// control for signed-in users. Embedded in RouteDetail. Self-contained (loads
// and persists its own data through the ticks data layer).

import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getRouteTicks, logTick, deleteTick, STYLES, STYLE_LABELS } from '../data/ticks'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function RouteLog({ route, wallId }) {
  const { user } = useAuth()
  const [ticks, setTicks] = useState([])
  const [logging, setLogging] = useState(false)
  const [style, setStyle] = useState('redpoint')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    getRouteTicks(route.id).then((t) => alive && setTicks(t))
    return () => {
      alive = false
    }
  }, [route.id])

  async function submit() {
    setBusy(true)
    try {
      await logTick({ routeId: route.id, wallId, style, note })
      setNote('')
      setLogging(false)
      setTicks(await getRouteTicks(route.id))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    await deleteTick(id)
    setTicks(await getRouteTicks(route.id))
  }

  return (
    <section className="detail-section">
      <h3>Ascents</h3>
      <p className="tick-count">
        {ticks.length === 0
          ? 'No logged ascents yet — be the first.'
          : `${ticks.length} logged ascent${ticks.length > 1 ? 's' : ''}`}
      </p>

      {ticks.length > 0 && (
        <ul className="tick-list">
          {ticks.slice(0, 6).map((t) => (
            <li key={t.id} className="tick-item">
              <strong>{t.authorName}</strong>
              {t.style && <span className="tick-style">{STYLE_LABELS[t.style] || t.style}</span>}
              <span className="tick-date">{fmtDate(t.climbedOn)}</span>
              {user && t.authorId === user.id && (
                <button className="note-delete" onClick={() => remove(t.id)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!user ? (
        <p className="auth-intro">Sign in to log your ascents.</p>
      ) : logging ? (
        <div className="log-form">
          <div className="chips">
            {STYLES.map((s) => (
              <button
                key={s}
                className={`chip ${style === s ? 'on' : ''}`}
                onClick={() => setStyle(s)}
              >
                {STYLE_LABELS[s]}
              </button>
            ))}
          </div>
          <textarea
            className="pin-textarea"
            rows={2}
            placeholder="Optional note — conditions, beta, how it felt…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="pin-actions">
            <button className="reset" onClick={() => setLogging(false)}>Cancel</button>
            <button className="pin-save" disabled={busy} onClick={submit}>
              {busy ? 'Logging…' : 'Log it'}
            </button>
          </div>
        </div>
      ) : (
        <button className="pin-save" onClick={() => setLogging(true)}>✓ I climbed this</button>
      )}
    </section>
  )
}
