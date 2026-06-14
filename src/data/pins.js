// Data-layer interface for personal pins. UI calls ONLY these functions
// (CLAUDE.md rule 2). Pins now live in the SHARED Supabase backend: everyone
// reads all pins; only signed-in users can write, and only their own rows
// (enforced by Row-Level Security in supabase/schema.sql).
//
// Stage A3: online path. Offline caching/sync returns in Stage B — until then
// these need connectivity.

import { supabase } from './supabase'
import { getCurrentUser } from './auth'
import { isOnline, cachePutAll, cacheGetAll, cachePut, cacheDelete, enqueue } from './sync'

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

/** All shared pins, newest first. Online: fetch + refresh cache. Offline: cache. */
export async function getPins() {
  if (isOnline() && supabase) {
    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) {
      await cachePutAll('pins', data)
      return data.map(rowToPin)
    }
    console.warn('getPins online failed, using cache:', error.message)
  }
  const cached = await cacheGetAll('pins')
  return cached.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(rowToPin)
}

/** Create a pin (requires sign-in). Writes through cache; queues if offline. */
export async function addPin({ category, label, notes, lng, lat }) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to add a pin.')
  const now = new Date().toISOString()
  const row = {
    id: crypto.randomUUID(),
    author_id: user.id,
    category: category || DEFAULT_CATEGORY,
    label: label || '',
    notes: notes || '',
    lng,
    lat,
    created_at: now,
    updated_at: now,
  }
  await cachePut('pins', row) // optimistic — shows immediately
  if (isOnline() && supabase) {
    const { error } = await supabase.from('pins').insert(row)
    if (error) await enqueue({ table: 'pins', op: 'insert', payload: row })
  } else {
    await enqueue({ table: 'pins', op: 'insert', payload: row })
  }
  return rowToPin(row)
}

/** Persist edits to a pin (only your own, per RLS). Returns the updated pin. */
export async function updatePin(pin) {
  const existing = (await cacheGetAll('pins')).find((r) => r.id === pin.id) || {}
  const changes = {
    category: pin.category,
    label: pin.label,
    notes: pin.notes,
    lng: pin.lng,
    lat: pin.lat,
    updated_at: new Date().toISOString(),
  }
  const row = { ...existing, ...changes, id: pin.id }
  await cachePut('pins', row)
  if (isOnline() && supabase) {
    const { error } = await supabase.from('pins').update(changes).eq('id', pin.id)
    if (error) await enqueue({ table: 'pins', op: 'update', payload: { id: pin.id, changes } })
  } else {
    await enqueue({ table: 'pins', op: 'update', payload: { id: pin.id, changes } })
  }
  return rowToPin(row)
}

/** Delete a pin by id (only your own, per RLS). */
export async function deletePin(id) {
  await cacheDelete('pins', id)
  if (isOnline() && supabase) {
    const { error } = await supabase.from('pins').delete().eq('id', id)
    if (error) await enqueue({ table: 'pins', op: 'delete', payload: { id } })
  } else {
    await enqueue({ table: 'pins', op: 'delete', payload: { id } })
  }
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
