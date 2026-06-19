// Grade pyramid for the personal logbook ("You" tab): how many distinct routes
// you've sent at each grade. The classic climbing-progress view — as you
// improve, the mass shifts upward. Built entirely from tick data you already
// log (route grades come from the seed via routeRef), so it needs no extra input.

import { routeRef } from '../data/routes'
import { parseYdsBase, parseVgrade } from '../data/routes'

// Count DISTINCT routes per grade bucket, split by scale (YDS vs V). Repeats of
// the same route don't inflate the pyramid — it's about routes climbed.
function buildBuckets(ticks) {
  const seen = new Set()
  const yds = new Map() // baseNumber -> count
  const v = new Map() // vNumber -> count
  let total = 0
  for (const t of ticks) {
    if (seen.has(t.routeId)) continue
    const ref = routeRef(t.routeId)
    if (!ref || !ref.grade) continue
    seen.add(t.routeId)
    const vn = parseVgrade(ref.grade)
    if (vn != null) {
      v.set(vn, (v.get(vn) || 0) + 1)
      total++
      continue
    }
    const yn = parseYdsBase(ref.grade)
    if (yn != null) {
      yds.set(yn, (yds.get(yn) || 0) + 1)
      total++
    }
  }
  return { yds, v, total }
}

// One pyramid for a scale: rows hardest-at-top, bars centered so the silhouette
// reads as a pyramid. `label` formats a bucket key into its grade string.
function Pyramid({ title, buckets, label }) {
  if (buckets.size === 0) return null
  const keys = [...buckets.keys()].sort((a, b) => b - a) // hardest first
  const max = Math.max(...buckets.values())
  return (
    <div className="pyramid">
      <h4 className="pyramid-title">{title}</h4>
      {keys.map((k) => {
        const count = buckets.get(k)
        return (
          <div key={k} className="pyramid-row">
            <span className="pyramid-grade">{label(k)}</span>
            <span className="pyramid-bar-wrap">
              <span className="pyramid-bar" style={{ width: `${(count / max) * 100}%` }}>
                {count}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function GradePyramid({ ticks }) {
  const { yds, v, total } = buildBuckets(ticks)
  if (total === 0) return null

  // Hardest sent, for the summary line.
  const hardestYds = yds.size ? Math.max(...yds.keys()) : null
  const hardestV = v.size ? Math.max(...v.keys()) : null
  const hardest = [
    hardestYds != null ? `5.${hardestYds}` : null,
    hardestV != null ? `V${hardestV}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="pyramids">
      <p className="pyramid-summary">
        {total} route{total > 1 ? 's' : ''} sent{hardest ? ` · hardest ${hardest}` : ''}
      </p>
      <Pyramid title="Ropes" buckets={yds} label={(n) => `5.${n}`} />
      <Pyramid title="Bouldering" buckets={v} label={(n) => `V${n}`} />
    </section>
  )
}
