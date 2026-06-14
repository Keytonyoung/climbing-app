// Data-layer interface for wall-location corrections. The OpenBeta seed is
// read-only, so corrected coordinates live here in Supabase and are overlaid on
// the seed at render time (see getWallsGeoJSON in routes.js). One row per wall;
// any signed-in user may set/replace it (last-write-wins, attributed). Offline-
// capable via the Stage B cache + outbox.

import { supabase } from './supabase'
import { getCurrentUser, displayName } from './auth'
import { isOnline, cachePutAll, cacheGetAll, cachePut, cacheDelete, enqueue } from './sync'

// Cache rows carry author_name (denormalized for offline display); it is NOT a
// DB column, so it's stripped before writing to Supabase.
function rowsToMap(rows) {
  const map = {}
  for (const r of rows) {
    map[r.wall_id] = {
      lng: r.lng,
      lat: r.lat,
      authorId: r.author_id,
      authorName: r.author_name || null,
      updatedAt: r.updated_at,
    }
  }
  return map
}

/** All corrections as { [wallId]: { lng, lat, authorId, authorName } }. */
export async function getOverrides() {
  if (isOnline() && supabase) {
    const { data, error } = await supabase.from('wall_overrides').select('*')
    if (!error) {
      // Resolve author names once (small table) and cache them in.
      const ids = [...new Set(data.map((r) => r.author_id).filter(Boolean))]
      const names = {}
      if (ids.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ids)
        for (const p of profiles || []) names[p.id] = p.display_name
      }
      const rows = data.map((r) => ({ ...r, author_name: names[r.author_id] || 'a contributor' }))
      await cachePutAll('overrides', rows)
      return rowsToMap(rows)
    }
    console.warn('getOverrides online failed, using cache:', error.message)
  }
  return rowsToMap(await cacheGetAll('overrides'))
}

/** Set/replace a wall's corrected location (requires sign-in). */
export async function setOverride(wallId, lng, lat) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to fix a location.')
  const dbRow = { wall_id: wallId, lng, lat, author_id: user.id, updated_at: new Date().toISOString() }
  await cachePut('overrides', { ...dbRow, author_name: displayName(user) })
  if (isOnline() && supabase) {
    const { error } = await supabase.from('wall_overrides').upsert(dbRow)
    if (error) await enqueue({ table: 'wall_overrides', op: 'insert', payload: dbRow })
  } else {
    await enqueue({ table: 'wall_overrides', op: 'insert', payload: dbRow })
  }
}

/** Remove a wall's correction (reset to the original OpenBeta coordinate). */
export async function resetOverride(wallId) {
  await cacheDelete('overrides', wallId)
  if (isOnline() && supabase) {
    const { error } = await supabase.from('wall_overrides').delete().eq('wall_id', wallId)
    if (error) await enqueue({ table: 'wall_overrides', op: 'delete', payload: { column: 'wall_id', value: wallId } })
  } else {
    await enqueue({ table: 'wall_overrides', op: 'delete', payload: { column: 'wall_id', value: wallId } })
  }
}
