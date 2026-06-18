// IndexedDB connection. Owned by the data layer — UI never imports this directly
// (CLAUDE.md rule 2). Now serves the OFFLINE layer (Stage B): the pins/tracks/
// notes stores hold a read cache of shared data (Supabase ROW shape), and the
// outbox holds writes made offline, to flush on reconnect. See sync.js.

import { openDB } from 'idb'

const DB_NAME = 'climbing-app'
const DB_VERSION = 6

let dbPromise = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Each `if (oldVersion < N)` is a migration step, applied in order.
        // v1: personal pins.
        if (oldVersion < 1) {
          db.createObjectStore('pins', { keyPath: 'id' })
        }
        // v2: recorded approach trails (Phase 3b).
        if (oldVersion < 2) {
          db.createObjectStore('tracks', { keyPath: 'id' })
        }
        // v3: notes (one per target, key = "kind:id") + photos (many per target,
        // looked up by a targetKey index). Phase 3c.
        if (oldVersion < 3) {
          db.createObjectStore('notes', { keyPath: 'id' })
          const photos = db.createObjectStore('photos', { keyPath: 'id' })
          photos.createIndex('targetKey', 'targetKey')
        }
        // v4 (Stage B): outbox of writes made offline, flushed on reconnect.
        // The pins/tracks/notes stores above are reused as the read cache.
        if (oldVersion < 4) {
          db.createObjectStore('outbox', { keyPath: 'id' })
        }
        // v5: cache of wall-location corrections (keyed by OpenBeta wall id).
        if (oldVersion < 5) {
          db.createObjectStore('overrides', { keyPath: 'wall_id' })
        }
        // v6: cache of logged ascents (ticks), indexed by route.
        if (oldVersion < 6) {
          const ticks = db.createObjectStore('ticks', { keyPath: 'id' })
          ticks.createIndex('route_id', 'route_id')
        }
      },
    })
  }
  return dbPromise
}
