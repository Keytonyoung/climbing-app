// Pure grade-pyramid math, split out of the component so it's unit-testable.
// Takes plain grade strings; the UI resolves tick -> grade via routeRef first.

import { parseYdsBase, parseVgrade } from './routes'

/**
 * Bucket grade strings by scale. Returns { yds, v, total } where yds/v are
 * Maps of difficulty-number -> count. V grades win when a string parses as both
 * (it won't in practice). `total` is how many graded entries were counted.
 */
export function bucketGrades(grades) {
  const yds = new Map()
  const v = new Map()
  let total = 0
  for (const grade of grades) {
    if (!grade) continue
    const vn = parseVgrade(grade)
    if (vn != null) {
      v.set(vn, (v.get(vn) || 0) + 1)
      total++
      continue
    }
    const yn = parseYdsBase(grade)
    if (yn != null) {
      yds.set(yn, (yds.get(yn) || 0) + 1)
      total++
    }
  }
  return { yds, v, total }
}

/** Hardest sent on each scale, formatted (e.g. "5.11 · V4"), or '' if none. */
export function hardestLabel({ yds, v }) {
  const parts = []
  if (yds.size) parts.push(`5.${Math.max(...yds.keys())}`)
  if (v.size) parts.push(`V${Math.max(...v.keys())}`)
  return parts.join(' · ')
}
