// Grade pyramid for the personal logbook ("You" tab): how many distinct routes
// you've sent at each grade. The classic climbing-progress view — as you
// improve, the mass shifts upward. Built entirely from tick data you already
// log (route grades come from the seed via routeRef), so it needs no extra input.

import { routeRef } from '../data/routes'
import { bucketGrades, hardestLabel } from '../data/pyramid'

// Distinct routes you've sent -> their grade strings (repeats don't count
// twice). The bucketing math itself lives in data/pyramid.js (unit-tested).
function gradesFromTicks(ticks) {
  const seen = new Set()
  const grades = []
  for (const t of ticks) {
    if (seen.has(t.routeId)) continue
    const ref = routeRef(t.routeId)
    if (!ref || !ref.grade) continue
    seen.add(t.routeId)
    grades.push(ref.grade)
  }
  return grades
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
  const { yds, v, total } = bucketGrades(gradesFromTicks(ticks))
  if (total === 0) return null
  const hardest = hardestLabel({ yds, v })

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
