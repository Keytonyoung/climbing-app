// Data-layer interface for personal pins. UI calls ONLY these functions
// (CLAUDE.md rule 2). Pins now live in the SHARED Supabase backend: everyone
// reads all pins; only signed-in users can write, and only their own rows
// (enforced by Row-Level Security in supabase/schema.sql).
//
// Stage A3: online path. Offline caching/sync returns in Stage B — until then
// these need connectivity.

import { supabase } from './supabase'
import { getCurrentUser } from './auth'

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

// Map a Supabase row (snake_case) to the shape the UI uses.
function rowToPin(r) {
  return {
    id: r.id,
    category: r.category,
    label: r.label,
    notes: r.notes,
    lng: r.lng,
    lat: r.lat,
    authorId: r.author_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** All shared pins, newest first. Returns [] if the backend is unreachable. */
export async function getPins() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('pins')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('getPins failed:', error.message)
    return []
  }
  return data.map(rowToPin)
}

/** Create a shared pin (requires sign-in). Returns the saved pin. */
export async function addPin({ category, label, notes, lng, lat }) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to add a pin.')
  const { data, error } = await supabase
    .from('pins')
    .insert({
      id: crypto.randomUUID(),
      author_id: user.id,
      category: category || DEFAULT_CATEGORY,
      label: label || '',
      notes: notes || '',
      lng,
      lat,
    })
    .select()
    .single()
  if (error) throw error
  return rowToPin(data)
}

/** Persist edits to a pin (only your own, per RLS). Returns the updated pin. */
export async function updatePin(pin) {
  const { data, error } = await supabase
    .from('pins')
    .update({
      category: pin.category,
      label: pin.label,
      notes: pin.notes,
      lng: pin.lng,
      lat: pin.lat,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pin.id)
    .select()
    .single()
  if (error) throw error
  return rowToPin(data)
}

/** Delete a pin by id (only your own, per RLS). */
export async function deletePin(id) {
  const { error } = await supabase.from('pins').delete().eq('id', id)
  if (error) throw error
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

/** Pretty-printed GeoJSON string of all loaded pins, for a quick file export. */
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
        authorId: p.authorId,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    })),
  }
  return JSON.stringify(fc, null, 2)
}
