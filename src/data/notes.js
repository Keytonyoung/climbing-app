// Data-layer interface for notes and photos on routes and walls (CLAUDE.md
// rule 2). NOTES are now a SHARED, timestamped thread in Supabase: many entries
// per route/wall, each authored and dated, the seed of the social layer.
// Everyone reads; signed-in users add; you can delete your own.
//
// PHOTOS still live locally in IndexedDB for now (Stage A4 moves them to
// Supabase Storage), so the photo helpers below are unchanged.

import { supabase } from './supabase'
import { getCurrentUser, displayName } from './auth'
import { isOnline, cacheGetAll, cachePut, cachePutMany, cacheDelete, enqueue } from './sync'

// Cached note rows carry a denormalized author_name for offline display; it is
// NOT a DB column, so it's stripped before writing to Supabase.
function cacheToNote(r) {
  return {
    id: r.id,
    text: r.text,
    authorId: r.author_id,
    authorName: r.author_name || 'Climber',
    createdAt: r.created_at,
  }
}

// --- Notes: shared timestamped thread (Supabase + offline cache) ---

/** All notes for a target, newest first, each with its author's display name. */
export async function getNotes(kind, id) {
  if (isOnline() && supabase) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('target_kind', kind)
      .eq('target_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (!error) {
      // Resolve author names (no FK to embed on), then cache with names baked in.
      const authorIds = [...new Set(data.map((n) => n.author_id))]
      const names = {}
      if (authorIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', authorIds)
        for (const p of profiles || []) names[p.id] = p.display_name
      }
      const rows = data.map((n) => ({ ...n, author_name: names[n.author_id] || 'Climber' }))
      // Refresh this target's slice of the cache (drop stale, add fresh).
      const freshIds = new Set(rows.map((r) => r.id))
      const stale = (await cacheGetAll('notes')).filter(
        (r) => r.target_kind === kind && r.target_id === id && !freshIds.has(r.id)
      )
      for (const s of stale) await cacheDelete('notes', s.id)
      await cachePutMany('notes', rows)
      return rows.map(cacheToNote)
    }
    console.warn('getNotes online failed, using cache:', error.message)
  }
  const cached = (await cacheGetAll('notes'))
    .filter((r) => r.target_kind === kind && r.target_id === id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  return cached.map(cacheToNote)
}

/** Add a note to the thread (requires sign-in). Queues if offline. */
export async function addNote(kind, id, text) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to add a note.')
  const trimmed = (text || '').trim()
  if (!trimmed) return
  const now = new Date().toISOString()
  const dbRow = {
    id: crypto.randomUUID(),
    author_id: user.id,
    target_kind: kind,
    target_id: id,
    text: trimmed,
    created_at: now,
  }
  await cachePut('notes', { ...dbRow, author_name: displayName(user) })
  if (isOnline() && supabase) {
    const { error } = await supabase.from('notes').insert(dbRow)
    if (error) await enqueue({ table: 'notes', op: 'insert', payload: dbRow })
  } else {
    await enqueue({ table: 'notes', op: 'insert', payload: dbRow })
  }
}

/** Delete one of your own notes (RLS enforces ownership). Queues if offline. */
export async function deleteNote(noteId) {
  await cacheDelete('notes', noteId)
  if (isOnline() && supabase) {
    const { error } = await supabase.from('notes').delete().eq('id', noteId)
    if (error) await enqueue({ table: 'notes', op: 'delete', payload: { id: noteId } })
  } else {
    await enqueue({ table: 'notes', op: 'delete', payload: { id: noteId } })
  }
}

// --- Photos: shared (Supabase Storage 'photos' bucket + photos table) ---

const BUCKET = 'photos'

function publicUrl(path) {
  // Pure string builder (no network), so it resolves offline too; the bytes at
  // that URL are served from the service-worker cache when there's no signal.
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

function rowToPhoto(p) {
  return {
    id: p.id,
    authorId: p.author_id,
    storagePath: p.storage_path,
    caption: p.caption || '',
    url: publicUrl(p.storage_path),
  }
}

/** A target's photos, newest first, each with a public image URL. Online:
 *  fetch + refresh the offline cache. Offline: serve from cache so photos you
 *  viewed online are still there at the crag. */
export async function getPhotos(kind, id) {
  if (!supabase) return []
  if (isOnline()) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('target_kind', kind)
      .eq('target_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (!error) {
      // Refresh this target's slice of the cache (drop stale, add fresh).
      const freshIds = new Set(data.map((r) => r.id))
      const stale = (await cacheGetAll('photos')).filter(
        (r) => r.target_kind === kind && r.target_id === id && !freshIds.has(r.id)
      )
      for (const s of stale) await cacheDelete('photos', s.id)
      await cachePutMany('photos', data)
      return data.map(rowToPhoto)
    }
    console.warn('getPhotos online failed, using cache:', error.message)
  }
  return (await cacheGetAll('photos'))
    .filter((r) => r.target_kind === kind && r.target_id === id && !r.deleted_at)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(rowToPhoto)
}

/**
 * Prefetch ALL beta (notes + photos) for a downloaded area so it's fully usable
 * offline without having opened each route first. Caches note/photo ROWS for
 * the area's targets and fetches each photo's image BYTES (the service worker
 * caches them, see vite.config.js). Returns counts.
 *
 * The tables are small (trusted group), so we fetch them whole and filter
 * client-side. Avoids giant `.in(routeIds)` queries. When the data grows, add
 * a server-side area key and query by it instead.
 */
export async function prefetchBeta(wallIds, routeIds, { onProgress } = {}) {
  if (!supabase || !isOnline()) return { notes: 0, photos: 0 }
  const inArea = (r) =>
    (r.target_kind === 'wall' && wallIds.has(r.target_id)) ||
    (r.target_kind === 'route' && routeIds.has(r.target_id))

  // Notes (with author names denormalized for offline display, like getNotes).
  const { data: allNotes } = await supabase.from('notes').select('*').is('deleted_at', null)
  const notes = (allNotes || []).filter(inArea)
  const authorIds = [...new Set(notes.map((n) => n.author_id))]
  const names = {}
  if (authorIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', authorIds)
    for (const p of profs || []) names[p.id] = p.display_name
  }
  await cachePutMany('notes', notes.map((n) => ({ ...n, author_name: names[n.author_id] || 'Climber' })))

  // Photos: cache rows, then fetch the image bytes so the SW stores them.
  const { data: allPhotos } = await supabase.from('photos').select('*').is('deleted_at', null)
  const photos = (allPhotos || []).filter(inArea)
  await cachePutMany('photos', photos)
  let done = 0
  await Promise.all(
    photos.map(async (p) => {
      try {
        await fetch(publicUrl(p.storage_path), { mode: 'cors' })
      } catch {
        /* individual image failures are non-fatal */
      }
      onProgress?.(++done, photos.length)
    })
  )

  return { notes: notes.length, photos: photos.length }
}

/** Set/clear the caption on a photo (owner only, per RLS). */
export async function setPhotoCaption(photoId, caption) {
  if (!supabase) return
  const { error } = await supabase
    .from('photos')
    .update({ caption: (caption || '').trim() })
    .eq('id', photoId)
  if (error) throw error
}

/** Upload a (downscaled) photo Blob and record it (requires sign-in). */
export async function addPhoto(kind, id, blob) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to add a photo.')
  const photoId = crypto.randomUUID()
  const path = `${user.id}/${photoId}.jpg`
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (upErr) throw upErr
  const { error: insErr } = await supabase.from('photos').insert({
    id: photoId,
    author_id: user.id,
    target_kind: kind,
    target_id: id,
    storage_path: path,
  })
  if (insErr) {
    // The upload already succeeded, so without this the file would sit in the
    // bucket forever with no row pointing at it: invisible in the app, and
    // impossible to clean up through it. Realistic whenever the row is
    // rejected (rate limit, RLS) after the bytes are through.
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
    throw insErr
  }
}

/** Delete one of your own photos: the row first, then the file (RLS-scoped). */
export async function deletePhoto(photoId) {
  const { data } = await supabase.from('photos').select('storage_path').eq('id', photoId).maybeSingle()
  // Row first. It is the permission-checked half, so if it fails nothing has
  // been destroyed. Deleting the file first meant a rejected row delete left a
  // permanently broken image behind.
  const { error } = await supabase.from('photos').delete().eq('id', photoId)
  if (error) throw error
  if (data?.storage_path) {
    await supabase.storage.from(BUCKET).remove([data.storage_path]).catch(() => {})
  }
  await cacheDelete('photos', photoId)
}
