// Data-layer interface for notes and photos on routes and walls (CLAUDE.md
// rule 2). NOTES are now a SHARED, timestamped thread in Supabase: many entries
// per route/wall, each authored and dated — the seed of the social layer.
// Everyone reads; signed-in users add; you can delete your own.
//
// PHOTOS still live locally in IndexedDB for now (Stage A4 moves them to
// Supabase Storage), so the photo helpers below are unchanged.

import { supabase } from './supabase'
import { getCurrentUser } from './auth'

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
