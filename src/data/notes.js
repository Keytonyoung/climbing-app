// Data-layer interface for Cole's notes and photos attached to routes and walls.
// UI calls ONLY these functions (CLAUDE.md rule 2). Stored locally in IndexedDB.
// Photos are Cole's own only — OpenBeta photos are never imported (CLAUDE.md §5).

import { getDB } from './db'

/** Stable key for a target: one note per "kind:id", photos indexed by it. */
export function targetKey(kind, id) {
  return `${kind}:${id}`
}

// --- Notes (one editable text note per target) ---

/** The note for a target, or null. */
export async function getNote(kind, id) {
  const db = await getDB()
  return (await db.get('notes', targetKey(kind, id))) || null
}

/** Upsert a target's note. Empty text deletes the record. */
export async function saveNote(kind, id, text) {
  const db = await getDB()
  const key = targetKey(kind, id)
  const trimmed = (text || '').trim()
  if (!trimmed) {
    await db.delete('notes', key)
    return null
  }
  const existing = await db.get('notes', key)
  const now = new Date().toISOString()
  const note = {
    id: key,
    targetKind: kind,
    targetId: id,
    text: trimmed,
    source: 'cole',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
  await db.put('notes', note)
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})
  return note
}

// --- Photos (many per target) ---

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
