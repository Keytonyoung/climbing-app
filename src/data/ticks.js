// Data-layer interface for logged ascents ("ticks"). Drives the per-route tick
// count and (later) the activity feed. Any signed-in user can log (low-risk).
// Offline-capable via the Stage B cache + outbox.

import { supabase } from './supabase'
import { getCurrentUser, getDisplayNames, displayName } from './auth'
import { isOnline, cacheGetAll, cachePutMany, cachePut, cacheDelete, enqueue } from './sync'

export const STYLES = ['onsight', 'flash', 'redpoint', 'repeat', 'tr']
export const STYLE_LABELS = {
  onsight: 'Onsight',
  flash: 'Flash',
  redpoint: 'Redpoint',
  repeat: 'Repeat',
  tr: 'Top-rope',
}

function cacheToTick(r) {
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: r.author_name || 'a climber',
    routeId: r.route_id,
    wallId: r.wall_id,
    style: r.style,
    note: r.note,
    climbedOn: r.climbed_on,
    createdAt: r.created_at,
  }
}

/** All ticks for a route, newest first, each with the author's display name. */
export async function getRouteTicks(routeId) {
  if (isOnline() && supabase) {
    const { data, error } = await supabase
      .from('ticks')
      .select('*')
      .eq('route_id', routeId)
      .order('created_at', { ascending: false })
    if (!error) {
      const names = await getDisplayNames(data.map((r) => r.author_id))
      const rows = data.map((r) => ({ ...r, author_name: names[r.author_id] || 'a climber' }))
      // Refresh this route's slice of the cache.
      const fresh = new Set(rows.map((r) => r.id))
      const stale = (await cacheGetAll('ticks')).filter(
        (r) => r.route_id === routeId && !fresh.has(r.id)
      )
      for (const s of stale) await cacheDelete('ticks', s.id)
      await cachePutMany('ticks', rows)
      return rows.map(cacheToTick)
    }
    console.warn('getRouteTicks online failed, using cache:', error.message)
  }
  return (await cacheGetAll('ticks'))
    .filter((r) => r.route_id === routeId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(cacheToTick)
}

/** Log an ascent (requires sign-in). Queues if offline. */
export async function logTick({ routeId, wallId, style, note, climbedOn }) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to log a climb.')
  const dbRow = {
    id: crypto.randomUUID(),
    author_id: user.id,
    route_id: routeId,
    wall_id: wallId || null,
    style: style || null,
    note: (note || '').trim(),
    climbed_on: climbedOn || new Date().toISOString().slice(0, 10),
    is_public: true,
    created_at: new Date().toISOString(),
  }
  await cachePut('ticks', { ...dbRow, author_name: displayName(user) })
  if (isOnline() && supabase) {
    const { error } = await supabase.from('ticks').insert(dbRow)
    if (error) await enqueue({ table: 'ticks', op: 'insert', payload: dbRow })
  } else {
    await enqueue({ table: 'ticks', op: 'insert', payload: dbRow })
  }
}

/** Recent ascents for the feed. `mine` + `userId` restricts to your own logs.
 *  Returns enriched ticks (author name resolved); route labels are resolved in
 *  the UI via routeRef so this stays a pure data query. */
export async function getRecentTicks({ mine = false, userId = null, limit = 50 } = {}) {
  if (!isOnline() || !supabase) {
    // Offline: serve from cache (whatever routes we've viewed/logged).
    let rows = await cacheGetAll('ticks')
    if (mine && userId) rows = rows.filter((r) => r.author_id === userId)
    return rows
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
      .map(cacheToTick)
  }
  let query = supabase.from('ticks').select('*').order('created_at', { ascending: false }).limit(limit)
  if (mine && userId) query = query.eq('author_id', userId)
  const { data, error } = await query
  if (error) {
    console.warn('getRecentTicks failed:', error.message)
    return []
  }
  const names = await getDisplayNames(data.map((r) => r.author_id))
  return data.map((r) => cacheToTick({ ...r, author_name: names[r.author_id] || 'a climber' }))
}

/** Remove one of your own logged ascents. */
export async function deleteTick(id) {
  await cacheDelete('ticks', id)
  if (isOnline() && supabase) {
    const { error } = await supabase.from('ticks').delete().eq('id', id)
    if (error) await enqueue({ table: 'ticks', op: 'delete', payload: { id } })
  } else {
    await enqueue({ table: 'ticks', op: 'delete', payload: { id } })
  }
}
