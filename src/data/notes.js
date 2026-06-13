// Data-layer interface for notes and photos on routes and walls (CLAUDE.md
// rule 2). NOTES are now a SHARED, timestamped thread in Supabase: many entries
// per route/wall, each authored and dated — the seed of the social layer.
// Everyone reads; signed-in users add; you can delete your own.
//
// PHOTOS still live locally in IndexedDB for now (Stage A4 moves them to
// Supabase Storage), so the photo helpers below are unchanged.

import { supabase } from './supabase'
import { getCurrentUser } from './auth'
import { getDB } from './db'

/** Stable key for a target, used by the local photo index. */
export function targetKey(kind, id) {
  return `${kind}:${id}`
}

// --- Notes: shared timestamped thread (Supabase) ---

/** All notes for a target, newest first, each with its author's display name. */
export async function getNotes(kind, id) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('target_kind', kind)
    .eq('target_id', id)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('getNotes failed:', error.message)
    return []
  }
  // Resolve author names in one extra query (no direct FK to embed on).
  const authorIds = [...new Set(data.map((n) => n.author_id))]
  const names = {}
  if (authorIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', authorIds)
    for (const p of profiles || []) names[p.id] = p.display_name
  }
  return data.map((n) => ({
    id: n.id,
    text: n.text,
    authorId: n.author_id,
    authorName: names[n.author_id] || 'Climber',
    createdAt: n.created_at,
  }))
}

/** Add a note to the thread (requires sign-in). */
export async function addNote(kind, id, text) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to add a note.')
  const trimmed = (text || '').trim()
  if (!trimmed) return
  const { error } = await supabase.from('notes').insert({
    id: crypto.randomUUID(),
    author_id: user.id,
    target_kind: kind,
    target_id: id,
    text: trimmed,
  })
  if (error) throw error
}

/** Delete one of your own notes (RLS enforces ownership). */
export async function deleteNote(noteId) {
  const { error } = await supabase.from('notes').delete().eq('id', noteId)
  if (error) throw error
}

// --- Photos: still local (IndexedDB) until Stage A4 ---

/** A target's photos, newest first. */
export async function getPhotos(kind, id) {
  const db = await getDB()
  const photos = await db.getAllFromIndex('photos', 'targetKey', targetKey(kind, id))
  return photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Store a (already-downscaled) photo Blob for a target. Returns the record. */
export async function addPhoto(kind, id, blob) {
  const photo = {
    id: crypto.randomUUID(),
    targetKind: kind,
    targetId: id,
    targetKey: targetKey(kind, id),
    blob,
    source: 'cole',
    createdAt: new Date().toISOString(),
  }
  const db = await getDB()
  await db.put('photos', photo)
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})
  return photo
}

/** Delete a photo by id. */
export async function deletePhoto(photoId) {
  const db = await getDB()
  await db.delete('photos', photoId)
}
