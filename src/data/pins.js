// Data-layer interface for personal pins. UI calls ONLY these functions
// (CLAUDE.md rule 2). Pins now live in the SHARED Supabase backend: everyone
// reads all pins; only signed-in users can write, and only their own rows
// (enforced by Row-Level Security in supabase/schema.sql).
//
// Stage A3: online path. Offline caching/sync returns in Stage B — until then
// these need connectivity.

import { supabase } from './supabase'
import { getCurrentUser, getDisplayNames, displayName } from './auth'
import { isOnline, cachePutAll, cacheGetAll, cachePut, cacheDelete, enqueue } from './sync'

// Pin categories: the single source of truth for labels and map colors.
// Palette: "High Desert" (see src/index.css) — each reads distinct from the
// terracotta (#b6532f) climbing walls while staying warm/harmonized.
export const CATEGORIES = [
  { key: 'parking', label: 'Parking', color: '#3a6ea5' }, // denim sky
  { key: 'trailhead', label: 'Trailhead', color: '#4a7c4e' }, // sage
  { key: 'water', label: 'Water', color: '#2687a0' }, // river teal
  { key: 'camp', label: 'Camp', color: '#c98a2d' }, // ochre
  { key: 'other', label: 'Other', color: '#7d5ba6' }, // dusk violet
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
    sensitive: !!r.sensitive,
    lng: r.lng,
    lat: r.lat,
    authorId: r.author_id,
    authorName: r.author_name || null,
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
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (!error) {
      // Denormalize author names into the cache for offline attribution.
      const names = await getDisplayNames(data.map((r) => r.author_id))
      const rows = data.map((r) => ({ ...r, author_name: names[r.author_id] || 'a climber' }))
      await cachePutAll('pins', rows)
      return rows.map(rowToPin)
    }
    console.warn('getPins online failed, using cache:', error.message)
  }
  const cached = await cacheGetAll('pins')
  return cached.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(rowToPin)
}

/** Create a pin (requires sign-in). Writes through cache; queues if offline. */
export async function addPin({ category, label, notes, lng, lat, sensitive }) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to add a pin.')
  const now = new Date().toISOString()
  const row = {
    id: crypto.randomUUID(),
    author_id: user.id,
    category: category || DEFAULT_CATEGORY,
    label: label || '',
    notes: notes || '',
    sensitive: !!sensitive,
    lng,
    lat,
    created_at: now,
    updated_at: now,
  }
  // Cache carries author_name for display; the DB row must not (no such column).
  await cachePut('pins', { ...row, author_name: displayName(user) })
  if (isOnline() && supabase) {
    const { error } = await supabase.from('pins').insert(row)
    if (error) await enqueue({ table: 'pins', op: 'insert', payload: row })
  } else {
    await enqueue({ table: 'pins', op: 'insert', payload: row })
  }
  return rowToPin({ ...row, author_name: displayName(user) })
}

/** Persist edits to a pin (only your own, per RLS). Returns the updated pin. */
export async function updatePin(pin) {
  const existing = (await cacheGetAll('pins')).find((r) => r.id === pin.id) || {}
  const changes = {
    category: pin.category,
    label: pin.label,
    notes: pin.notes,
    sensitive: !!pin.sensitive,
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
