// The data layer. UI components call ONLY these functions. Never the seed
// JSON, the OpenBeta API, or storage directly. When local storage is later
// replaced by a backend (CLAUDE.md section 4, rule 2), only this file changes.

// The route seed is loaded LAZILY (dynamic import) so the ~2.7MB JSON isn't
// baked into the main JS bundle, the app shell loads fast, then the route data
// streams in as a separate chunk. initSeed() must resolve before the sync
// getters below return data; App awaits it during map load.
let seed = null

export async function initSeed() {
  if (!seed) seed = (await import('./seed/western-co.json')).default
  return seed
}

function walls() {
  return seed ? seed.walls : []
}

/** All walls (crags), each with its list of routes. */
export function getWalls() {
  return walls()
}

/** A single wall by id, or undefined. */
export function getWall(id) {
  return walls().find((w) => w.id === id)
}

// Lazily-built route id -> { routeName, grade, wallId, wallName } index, for
// resolving logged ascents (which store only route_id) into readable labels.
let _routeIndex = null
function routeIndex() {
  if (!_routeIndex) {
    _routeIndex = new Map()
    for (const w of walls()) {
      for (const r of w.routes) {
        _routeIndex.set(r.id, {
          routeName: r.name,
          grade: r.grade,
          wallId: w.id,
          wallName: w.name,
        })
      }
    }
  }
  return _routeIndex
}

/** Resolve a route id to readable labels, or null if not in the seed. */
export function routeRef(routeId) {
  return routeIndex().get(routeId) || null
}

// --- Filtering ------------------------------------------------------------
//
// Two grade scales coexist: YDS (roped, sport/trad/toprope) and V (boulder).
// ~75% of routes are boulders, so we filter each scale independently and gate
// everything by route type.

// Route types present in the data, in a sensible display order.
export const ROUTE_TYPES = ['sport', 'trad', 'toprope', 'boulder', 'aid']

// YDS difficulty buckets by the "5.x" number (letters don't change the bucket).
// Bounds span the full real-world range so the default filter excludes nothing
// (the seed data has 5.2 routes; Rifle's 5.14s arrive in a later seed).
export const YDS_MIN = 0
export const YDS_MAX = 15
// V-scale buckets (V0–V17 covers every established boulder grade).
export const V_MIN = 0
export const V_MAX = 17

export const DEFAULT_FILTER = {
  types: [...ROUTE_TYPES],
  ydsMin: YDS_MIN,
  ydsMax: YDS_MAX,
  vMin: V_MIN,
  vMax: V_MAX,
}

/** "5.10c" -> 10, "5.9+" -> 9, anything non-YDS -> null. */
export function parseYdsBase(grade) {
  if (!grade) return null
  const m = String(grade).match(/^5\.(\d+)/)
  return m ? Number(m[1]) : null
}

/** "V4" -> 4, "V-easy" -> 0, "V10-11" -> 10, anything non-V -> null. */
export function parseVgrade(grade) {
  if (!grade) return null
  if (/^v-?\s*easy/i.test(grade)) return 0
  const m = String(grade).match(/^V(\d+)/i)
  return m ? Number(m[1]) : null
}

/** Does a single route pass the active filter? */
function routePasses(route, filter) {
  if (!filter.types.includes(route.type)) return false
  if (route.type === 'boulder') {
    const v = parseVgrade(route.grade)
    return v == null || (v >= filter.vMin && v <= filter.vMax)
  }
  // Roped + aid use the YDS range; routes with no YDS grade aren't constrained.
  const y = parseYdsBase(route.grade)
  return y == null || (y >= filter.ydsMin && y <= filter.ydsMax)
}

/** True when the filter shows everything (nothing narrowed). */
export function isDefaultFilter(filter) {
  return (
    filter.types.length === ROUTE_TYPES.length &&
    filter.ydsMin === YDS_MIN &&
    filter.ydsMax === YDS_MAX &&
    filter.vMin === V_MIN &&
    filter.vMax === V_MAX
  )
}

/** Walls whose routes match the filter, each carrying only its matching routes. */
export function getFilteredWalls(filter) {
  if (!filter || isDefaultFilter(filter)) return walls()
  const out = []
  for (const wall of walls()) {
    const routes = wall.routes.filter((r) => routePasses(r, filter))
    if (routes.length > 0) out.push({ ...wall, routes })
  }
  return out
}

/**
 * Filtered walls as a GeoJSON FeatureCollection for MapLibre. Each feature is
 * one wall; the matching route list rides along in properties (stringified,
 * GeoJSON props must be primitives) so a click handler needs no lookup.
 */
export function getWallsGeoJSON(filter, overrides = {}) {
  return {
    type: 'FeatureCollection',
    features: getFilteredWalls(filter).map((wall) => {
      const o = overrides[wall.id]
      const lng = o ? o.lng : wall.lng
      const lat = o ? o.lat : wall.lat
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          id: wall.id,
          name: wall.name,
          path: wall.path.join(' › '),
          routeCount: wall.routes.length,
          routes: JSON.stringify(wall.routes),
          moved: o ? 1 : 0,
          movedBy: o ? o.authorName || '' : '',
        },
      }
    }),
  }
}

/**
 * Search walls and routes by name. Returns up to `limit` results, each with the
 * wall id (and route id for route matches) so the UI can open it via deep link.
 */
export function searchWallsAndRoutes(query, limit = 25) {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  // Rank matches: name starts with the query (0) beats a word starting with it
  // (1) beats a mid-word substring (2), so "Otto" surfaces "Otto's ..." before
  // "Big Bottom Lip". Ties break toward shorter names (tighter match).
  const scoreOf = (name) => {
    const n = name.toLowerCase()
    const i = n.indexOf(q)
    if (i < 0) return -1
    if (i === 0) return 0
    return /[^a-z0-9]/.test(n[i - 1]) ? 1 : 2
  }
  const scored = []
  for (const wall of walls()) {
    const ws = scoreOf(wall.name)
    if (ws >= 0) {
      scored.push({
        score: ws,
        kind: 'wall',
        wallId: wall.id,
        title: wall.name,
        subtitle: wall.path.join(' › '),
      })
    }
    for (const r of wall.routes) {
      const rs = scoreOf(r.name)
      if (rs >= 0) {
        scored.push({
          score: rs,
          kind: 'route',
          wallId: wall.id,
          routeId: r.id,
          title: r.name,
          subtitle: `${r.grade ? r.grade + ' · ' : ''}${wall.name}`,
        })
      }
    }
  }
  scored.sort((a, b) => a.score - b.score || a.title.length - b.title.length)
  return scored.slice(0, limit).map(({ score, ...hit }) => hit) // eslint-disable-line no-unused-vars
}

/** Wall + route totals for the current filter (for the result count). */
export function getFilteredCounts(filter) {
  const walls = getFilteredWalls(filter)
  return {
    wallCount: walls.length,
    routeCount: walls.reduce((n, w) => n + w.routes.length, 0),
  }
}

/**
 * Wall + route ids whose wall falls inside a lng/lat bounding box. Used by
 * "Save area offline" to know which notes/photos to prefetch for the area.
 */
export function getAreaTargets({ west, south, east, north }) {
  const wallIds = new Set()
  const routeIds = new Set()
  for (const w of walls()) {
    if (w.lng >= west && w.lng <= east && w.lat >= south && w.lat <= north) {
      wallIds.add(w.id)
      for (const r of w.routes) routeIds.add(r.id)
    }
  }
  return { wallIds, routeIds }
}
