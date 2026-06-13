// Data-layer interface for recorded approach trails. UI calls ONLY these
// functions (CLAUDE.md rule 2). Trails now live in the SHARED Supabase backend:
// everyone reads all trails; only signed-in users write, owner-scoped by RLS.
//
// A trail goes from one anchor to another, where an anchor is { kind: 'pin' |
// 'wall', id }. The trail also keeps its own coordinates, so a deleted anchor
// never leaves an unrenderable trail — resolveAnchor falls back to the geometry.

import { supabase } from './supabase'
import { getCurrentUser } from './auth'
import { getWalls } from './routes'

// Map a Supabase row (snake_case) to the shape the UI uses.
function rowToTrack(r) {
  return {
    id: r.id,
    name: r.name,
    notes: r.notes,
    start: r.start_anchor,
    end: r.end_anchor,
    coordinates: r.coordinates,
    lengthMeters: r.length_m,
    authorId: r.author_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** All shared trails, newest first. Returns [] if the backend is unreachable. */
export async function getTracks() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('getTracks failed:', error.message)
    return []
  }
  return data.map(rowToTrack)
}

/** Create a shared trail (requires sign-in). Returns the saved track. */
export async function addTrack({ name, notes, start, end, coordinates }) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to save a trail.')
  const { data, error } = await supabase
    .from('tracks')
    .insert({
      id: crypto.randomUUID(),
      author_id: user.id,
      name: name || '',
      notes: notes || '',
      start_anchor: start,
      end_anchor: end,
      coordinates,
      length_m: trackLength(coordinates),
    })
    .select()
    .single()
  if (error) throw error
  return rowToTrack(data)
}

/** Persist edits to a trail (only your own, per RLS). Returns the updated track. */
export async function updateTrack(track) {
  const { data, error } = await supabase
    .from('tracks')
    .update({
      name: track.name,
      notes: track.notes,
      start_anchor: track.start,
      end_anchor: track.end,
      coordinates: track.coordinates,
      length_m: track.lengthMeters ?? trackLength(track.coordinates),
      updated_at: new Date().toISOString(),
    })
    .eq('id', track.id)
    .select()
    .single()
  if (error) throw error
  return rowToTrack(data)
}

/** Delete a trail by id (only your own, per RLS). */
export async function deleteTrack(id) {
  const { error } = await supabase.from('tracks').delete().eq('id', id)
  if (error) throw error
}

/** Trails as a GeoJSON FeatureCollection of LineStrings, for MapLibre. */
export function getTracksGeoJSON(tracks) {
  return {
    type: 'FeatureCollection',
    features: tracks.map((t) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: t.coordinates },
      properties: { id: t.id, name: t.name },
    })),
  }
}

/** Trails that anchor to a given wall on either end (wall-side display). */
export function getTracksForWall(wallId, tracks) {
  return tracks.filter(
    (t) =>
      (t.start.kind === 'wall' && t.start.id === wallId) ||
      (t.end.kind === 'wall' && t.end.id === wallId)
  )
}

// --- Geometry helpers -----------------------------------------------------

const R = 6371000 // earth radius, meters

/** Great-circle distance between [lng,lat] points, in meters. */
export function haversineMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Summed length of a coordinate path, in meters. */
export function trackLength(coords) {
  let total = 0
  for (let i = 1; i < coords.length; i++) total += haversineMeters(coords[i - 1], coords[i])
  return total
}

/** Feet under ~0.2 mi, else miles. Cole is US. */
export function formatDistance(m) {
  const feet = m * 3.28084
  if (feet < 1000) return `${Math.round(feet)} ft`
  return `${(m / 1609.34).toFixed(2)} mi`
}

// --- Anchors --------------------------------------------------------------

/**
 * Nearest anchor candidates to a point, merging Cole's pins with climbing walls.
 * `kind` ('pin' | 'wall') optionally restricts the pool; both ends can still
 * choose either type. Returns [{ kind, id, label, distance }] closest first.
 */
export function nearestAnchors(lng, lat, pins, { kind, n = 5 } = {}) {
  const here = [lng, lat]
  const candidates = []
  if (kind !== 'wall') {
    for (const p of pins) {
      candidates.push({
        kind: 'pin',
        id: p.id,
        label: p.label || 'Unnamed pin',
        distance: haversineMeters(here, [p.lng, p.lat]),
      })
    }
  }
  if (kind !== 'pin') {
    for (const w of getWalls()) {
      candidates.push({
        kind: 'wall',
        id: w.id,
        label: w.name,
        distance: haversineMeters(here, [w.lng, w.lat]),
      })
    }
  }
  return candidates.sort((a, b) => a.distance - b.distance).slice(0, n)
}

/**
 * Resolve an anchor to a label + coordinates for display and map-fit. Falls back
 * to the trail's own endpoint when the referenced pin/wall no longer exists.
 */
export function resolveAnchor(anchor, pins, fallbackCoord) {
  if (anchor) {
    if (anchor.kind === 'pin') {
      const p = pins.find((x) => x.id === anchor.id)
      if (p) return { label: p.label || 'Unnamed pin', coordinates: [p.lng, p.lat] }
    } else if (anchor.kind === 'wall') {
      const w = getWalls().find((x) => x.id === anchor.id)
      if (w) return { label: w.name, coordinates: [w.lng, w.lat] }
    }
  }
  return { label: '(anchor removed)', coordinates: fallbackCoord }
}
