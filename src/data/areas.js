// Saved-offline-areas registry (data layer — UI goes through these functions).
// Every "Save area offline" records what was saved (name, bounds, date, counts)
// so the app can SHOW the user what they have, re-download an area in one tap,
// and — critically — DETECT when the browser evicted the offline caches (iOS
// does this under storage pressure / after inactivity) instead of letting them
// discover it at a signal-less trailhead.

import { getDB } from './db'
import { getWalls } from './routes'

/** Human name for a bbox: the most common root area among the walls inside it
 *  (e.g. "Unaweep Canyon"), or a fallback. Seed must be loaded (initSeed). */
export function deriveAreaName({ west, south, east, north }) {
  const counts = new Map()
  for (const w of getWalls()) {
    if (w.lng >= west && w.lng <= east && w.lat >= south && w.lat <= north) {
      const root = w.path?.[0]
      if (root) counts.set(root, (counts.get(root) || 0) + 1)
    }
  }
  let best = null
  for (const [name, n] of counts) if (!best || n > best.n) best = { name, n }
  return best ? best.name : 'Saved area'
}

/** Record (or refresh) a saved area after a successful download. */
export async function recordSavedArea({ id, name, bounds, zoom, tiles, notes, photos, walls }) {
  const db = await getDB()
  await db.put('areas', {
    id: id || crypto.randomUUID(),
    name,
    bounds,
    zoom,
    tiles: tiles || 0,
    notes: notes || 0,
    photos: photos || 0,
    walls: walls || 0,
    savedAt: new Date().toISOString(),
  })
}

/** All saved areas, newest first. */
export async function getSavedAreas() {
  const db = await getDB()
  const rows = await db.getAll('areas')
  return rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function deleteSavedArea(id) {
  const db = await getDB()
  await db.delete('areas', id)
}

/**
 * Eviction detection: if the registry says areas were saved but the service-
 * worker tile cache is EMPTY, the browser purged offline storage (the classic
 * iOS eviction). Returns { evicted, areaCount } so the UI can warn and offer
 * one-tap re-downloads. Never throws — offline health checks must be harmless.
 */
export async function checkOfflineHealth() {
  try {
    const areas = await getSavedAreas()
    if (areas.length === 0) return { evicted: false, areaCount: 0 }
    if (!('caches' in window)) return { evicted: false, areaCount: areas.length }
    const names = await caches.keys()
    const tileCacheName = names.find((n) => n.includes('openfreemap-tiles'))
    if (!tileCacheName) return { evicted: true, areaCount: areas.length }
    const cache = await caches.open(tileCacheName)
    const keys = await cache.keys()
    return { evicted: keys.length === 0, areaCount: areas.length }
  } catch {
    return { evicted: false, areaCount: 0 }
  }
}
