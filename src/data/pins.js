// Data-layer interface for Cole's personal pins. UI calls ONLY these functions
// (CLAUDE.md rule 2). Pins are stored locally in IndexedDB and exportable as
// GeoJSON so the data is never trapped (CLAUDE.md §5).

import { getDB } from './db'

// Pin categories: the single source of truth for labels and map colors.
// Colors are chosen to read as distinct from the red (#e94560) climbing walls.
export const CATEGORIES = [
  { key: 'parking', label: 'Parking', color: '#2d6cdf' },
  { key: 'trailhead', label: 'Trailhead', color: '#16a34a' },
  { key: 'water', label: 'Water', color: '#0891b2' },
  { key: 'camp', label: 'Camp', color: '#d97706' },
  { key: 'other', label: 'Other', color: '#7c3aed' },
]

export const DEFAULT_CATEGORY = 'parking'

export function categoryColor(key) {
  return (CATEGORIES.find((c) => c.key === key) || CATEGORIES[0]).color
}

export function categoryLabel(key) {
  return (CATEGORIES.find((c) => c.key === key) || CATEGORIES[0]).label
}

/** All pins, newest first. */
export async function getPins() {
  const db = await getDB()
  const pins = await db.getAll('pins')
  return pins.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Create and persist a new pin. Returns the saved pin. */
export async function addPin({ category, label, notes, lng, lat }) {
  const now = new Date().toISOString()
  const pin = {
    id: crypto.randomUUID(),
    category: category || DEFAULT_CATEGORY,
    label: label || '',
    notes: notes || '',
    lng,
    lat,
    source: 'cole',
    createdAt: now,
    updatedAt: now,
  }
  const db = await getDB()
  await db.put('pins', pin)
  // Ask the browser to keep this data (reduces eviction risk). Fire-and-forget.
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})
  return pin
}

/** Persist edits to an existing pin. Returns the updated pin. */
export async function updatePin(pin) {
  const updated = { ...pin, updatedAt: new Date().toISOString() }
  const db = await getDB()
  await db.put('pins', updated)
  return updated
}

/** Delete a pin by id. */
export async function deletePin(id) {
  const db = await getDB()
  await db.delete('pins', id)
}

/** Pins as a GeoJSON FeatureCollection for MapLibre (mirrors getWallsGeoJSON). */
export function getPinsGeoJSON(pins) {
  return {
    type: 'FeatureCollection',
    features: pins.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        category: p.category,
        label: p.label,
      },
    })),
  }
}

/** Pretty-printed GeoJSON string of all pins, for file export/backup. */
export function exportPinsGeoJSON(pins) {
  const fc = {
    type: 'FeatureCollection',
    features: pins.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        category: p.category,
        label: p.label,
        notes: p.notes,
        source: p.source,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    })),
  }
  return JSON.stringify(fc, null, 2)
}
