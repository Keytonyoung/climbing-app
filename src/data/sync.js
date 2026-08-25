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

// A write that keeps failing is "poison". After this many attempts we set it
// aside so it can't wedge every later write behind it forever.
export const MAX_ATTEMPTS = 5

/**
 * Pure decision for a failed outbox op (extracted so it's unit-testable):
 * quarantine it once it has failed MAX_ATTEMPTS times, otherwise pause the drain
 * and retry it next flush. Returns { action, record }.
 */
export function nextOutboxState(item, errorMessage) {
  const attempts = (item.attempts || 0) + 1
  if (attempts >= MAX_ATTEMPTS) {
    return { action: 'quarantine', record: { ...item, attempts, failed: true, lastError: errorMessage } }
  }
  return { action: 'pause', record: { ...item, attempts } }
}

/** Drain queued writes to Supabase, oldest first. A transient failure (e.g.
 *  still offline) stops the drain so nothing is lost and it retries next time;
 *  a write that fails MAX_ATTEMPTS times is quarantined (marked failed and
 *  skipped) so it can't block the rest of the queue indefinitely. */
export async function flush() {
  if (!isOnline() || !supabase) return 0
  // We've likely been offline for hours, so the access token is probably stale.
  // Give Supabase a chance to refresh it BEFORE we spend outbox attempts on
  // auth failures. Otherwise a crag day's beta can burn its retries and get
  // quarantined at the trailhead, which would silently lose it.
  try {
    await supabase.auth.getSession()
  } catch {
    /* still no usable network; the ops below will retry next flush */
  }
  const db = await getDB()
  const items = (await db.getAll('outbox'))
    .filter((it) => !it.failed)
    .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))
  let synced = 0
  for (const item of items) {
    try {
      await applyOp(item)
      await db.delete('outbox', item.id)
      synced++
    } catch (e) {
      const { action, record } = nextOutboxState(item, e.message)
      await db.put('outbox', record)
      if (action === 'quarantine') {
        // Set aside and keep going. Don't let one bad op block the queue.
        console.warn(`flush: quarantined ${item.table}/${item.op}:`, e.message)
        continue
      }
      // Likely transient (offline / token refresh). Stop so order is preserved.
      console.warn('flush paused:', e.message)
      break
    }
  }
  return synced
}

/** Queued writes that were quarantined after repeated failures (for surfacing). */
export async function failedOps() {
  const db = await getDB()
  return (await db.getAll('outbox')).filter((it) => it.failed)
}

async function applyOp({ table, op, payload }) {
  if (op === 'insert') {
    const { error } = await supabase.from(table).upsert(payload)
    if (error) throw error
  } else if (op === 'update') {
    const { error } = await supabase.from(table).update(payload.changes).eq('id', payload.id)
    if (error) throw error
  } else if (op === 'delete') {
    // payload may target a non-'id' key column (e.g. wall_overrides.wall_id).
    const col = payload.column || 'id'
    const val = payload.value ?? payload.id
    const { error } = await supabase.from(table).delete().eq(col, val)
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
