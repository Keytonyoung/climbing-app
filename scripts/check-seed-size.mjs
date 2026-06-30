// Build guard: the bundled route-seed chunk must stay under Workbox's precache
// size cap, or the service worker silently skips it and OFFLINE BREAKS at the
// crag with no error. Runs after `vite build` (postbuild). Fails the build loud
// if the chunk gets too big, so it can never surprise us in the field.
//
// Keep CAP in sync with maximumFileSizeToCacheInBytes in vite.config.js.

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CAP = 4 * 1024 * 1024 // 4 MiB — must match vite.config.js
const WARN_AT = 0.85 // warn once we're within 85% of the cap
const ASSETS = join(process.cwd(), 'dist', 'assets')

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB'

let files
try {
  files = readdirSync(ASSETS)
} catch {
  console.error('seed-size check: dist/assets not found — did the build run?')
  process.exit(1)
}

const seed = files.find((f) => /^western-co-.*\.js$/.test(f))
if (!seed) {
  console.error('seed-size check: route-seed chunk (western-co-*.js) not found in dist/assets.')
  process.exit(1)
}

const size = statSync(join(ASSETS, seed)).size
if (size >= CAP) {
  console.error(
    `\n✖ Route-seed chunk is ${mb(size)} — at/over the ${mb(CAP)} offline-precache cap.\n` +
      `  The service worker will NOT cache it and offline will break at the crag.\n` +
      `  Trim the seed or move routes to the backend before shipping.\n`
  )
  process.exit(1)
}

if (size >= CAP * WARN_AT) {
  console.warn(`⚠ Route-seed chunk is ${mb(size)} — approaching the ${mb(CAP)} offline cap. Plan ahead.`)
} else {
  console.log(`✓ Route-seed chunk ${mb(size)} (offline cap ${mb(CAP)}).`)
}
