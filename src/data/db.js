// IndexedDB connection for Cole's personal data (pins, and later trails/photos).
// Owned by the data layer — UI never imports this directly (CLAUDE.md rule 2);
// it goes through pins.js and future siblings.

import { openDB } from 'idb'

const DB_NAME = 'climbing-app'
const DB_VERSION = 1

let dbPromise = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1: personal pins. Future versions add stores (trails, photos, notes)
        // by extending this switch — each `case` is a migration step.
        if (oldVersion < 1) {
          db.createObjectStore('pins', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}
