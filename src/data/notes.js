// Data-layer interface for notes and photos on routes and walls (CLAUDE.md
// rule 2). NOTES are now a SHARED, timestamped thread in Supabase: many entries
// per route/wall, each authored and dated — the seed of the social layer.
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
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** A target's photos, newest first, each with a public image URL. */
export async function getPhotos(kind, id) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('target_kind', kind)
    .eq('target_id', id)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('getPhotos failed:', error.message)
    return []
  }
  return data.map((p) => ({
    id: p.id,
    authorId: p.author_id,
    storagePath: p.storage_path,
    url: publicUrl(p.storage_path),
  }))
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
  if (insErr) throw insErr
}

/** Delete one of your own photos: remove the file then the row (RLS-scoped). */
export async function deletePhoto(photoId) {
  const { data } = await supabase.from('photos').select('storage_path').eq('id', photoId).single()
  if (data?.storage_path) await supabase.storage.from(BUCKET).remove([data.storage_path])
  const { error } = await supabase.from('photos').delete().eq('id', photoId)
  if (error) throw error
}
