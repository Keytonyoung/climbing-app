// IndexedDB connection for Cole's personal data (pins, and later trails/photos).
// Owned by the data layer — UI never imports this directly (CLAUDE.md rule 2);
// it goes through pins.js and future siblings.

import { openDB } from 'idb'

const DB_NAME = 'climbing-app'
const DB_VERSION = 2

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
      },
    })
  }
  return dbPromise
}
