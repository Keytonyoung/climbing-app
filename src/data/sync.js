// Offline engine (Stage B). Low-level cache + outbox helpers shared by the data
// modules, plus flush-on-reconnect. UI goes through the data modules, not this.
//
// Model: client-generated UUIDs mean an offline-created row keeps its id when it
// syncs (no reconciliation). Writes are append-heavy and "yours", so flushing is
// a simple in-order drain with last-write-wins.

import { getDB } from './db'
import { supabase } from './supabase'

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

// --- Read cache (stores hold Supabase ROW shape) ---

export async function cachePutAll(store, rows) {
  const db = await getDB()
  const tx = db.transaction(store, 'readwrite')
  await tx.store.clear()
  for (const row of rows) await tx.store.put(row)
  await tx.done
}

export async function cacheGetAll(store) {
  const db = await getDB()
  return db.getAll(store)
}

/** Put many rows without clearing the store (for per-target caches like notes). */
export async function cachePutMany(store, rows) {
  const db = await getDB()
  const tx = db.transaction(store, 'readwrite')
  for (const row of rows) await tx.store.put(row)
  await tx.done
}

export async function cachePut(store, row) {
  const db = await getDB()
  await db.put(store, row)
}

export async function cacheDelete(store, id) {
  const db = await getDB()
  await db.delete(store, id)
}

// --- Outbox (writes made offline) ---

/** Queue a write for later. `op` is 'insert' | 'update' | 'delete'. */
export async function enqueue({ table, op, payload }) {
  const db = await getDB()
  await db.put('outbox', {
    id: crypto.randomUUID(),
    table,
    op,
    payload,
    queuedAt: new Date().toISOString(),
  })
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})
}

export async function outboxCount() {
  const db = await getDB()
  return db.count('outbox')
}

/** Drain queued writes to Supabase, oldest first. Stops on the first failure
 *  (e.g. still offline) so nothing is lost — it retries next time. */
export async function flush() {
  if (!isOnline() || !supabase) return 0
  const db = await getDB()
  const items = (await db.getAll('outbox')).sort((a, b) =>
    a.queuedAt.localeCompare(b.queuedAt)
  )
  let synced = 0
  for (const item of items) {
    try {
      await applyOp(item)
      await db.delete('outbox', item.id)
      synced++
    } catch (e) {
      console.warn('flush stopped:', e.message)
      break
    }
  }
  return synced
}

async function applyOp({ table, op, payload }) {
  if (op === 'insert') {
    const { error } = await supabase.from(table).upsert(payload)
    if (error) throw error
  } else if (op === 'update') {
    const { error } = await supabase.from(table).update(payload.changes).eq('id', payload.id)
    if (error) throw error
  } else if (op === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', payload.id)
    if (error) throw error
  }
}

/** Flush now and whenever connectivity returns. `onSynced(n)` fires after a
 *  flush that moved anything, so the UI can re-fetch. */
export function initSync(onSynced) {
  const run = async () => {
    const n = await flush()
    if (n > 0) onSynced?.(n)
  }
  window.addEventListener('online', run)
  run()
  return () => window.removeEventListener('online', run)
}
