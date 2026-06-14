// Snapshot western Colorado climbing data from the OpenBeta GraphQL API.
//
// Run with: node scripts/fetch-openbeta.mjs
//
// Why a build-time snapshot (not live queries): there is no cell service at the
// crag, and the app must work fully offline. We fetch once, flatten the data
// into our own format, and bundle it. See CLAUDE.md sections 4-5.
//
// Output: src/data/seed/western-co.json — a flat list of WALLS, each carrying
// its routes. We pin walls (not individual routes) because OpenBeta routes
// inherit their wall's coordinates, so per-route pins would overlap exactly.

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = 'https://api.openbeta.io'

// Areas to seed (OpenBeta region/area names — verified to resolve to data).
// Add more here as Cole's climbing expands. NOTE: this bundles route data into
// the app and is near its practical ceiling (~7.5k routes); broader coverage
// needs the backend route re-architecture (see docs/v1-multiuser-plan.md).
const SEED_AREAS = [
  'Unaweep Canyon',
  'Colorado National Monument',
  'Southeast Utah', // Moab + Indian Creek / Castle Valley region
  'Glenwood Springs',
  'Glenwood Canyon',
  'Independence Pass', // Roaring Fork valley
]

// Build a nested children+climbs query to a fixed depth. The OpenBeta area tree
// is irregular (region -> canyon -> wall -> sometimes sub-wall), so we go deep
// enough to reach every leaf, then collect any node that actually has climbs.
function buildAreaQuery(depth) {
  const climbs = `climbs {
    id
    name
    grades { yds vscale }
    type { sport trad bouldering tr aid mixed snow ice alpine }
    content { description }
  }`
  const meta = `uuid area_name metadata { lat lng }`
  let inner = `${meta} ${climbs}`
  for (let i = 0; i < depth; i++) {
    inner = `${meta} ${climbs} children { ${inner} }`
  }
  return `query Seed($name: String!) {
    areas(filter: { area_name: { match: $name } }) { ${inner} }
  }`
}

async function gql(query, variables) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from OpenBeta`)
  const json = await res.json()
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`)
  return json.data
}

// Collapse OpenBeta's type flags into a single primary label for display/filter.
function primaryType(type) {
  if (!type) return 'other'
  if (type.bouldering) return 'boulder'
  if (type.sport) return 'sport'
  if (type.trad) return 'trad'
  if (type.tr) return 'toprope'
  if (type.aid) return 'aid'
  if (type.ice || type.mixed || type.snow || type.alpine) return 'ice/alpine'
  return 'other'
}

// Walk the area tree. Any node that directly contains climbs is a "wall".
function collectWalls(node, ancestors, out) {
  const path = [...ancestors, node.area_name]
  if (node.climbs && node.climbs.length > 0) {
    out.push({
      id: node.uuid,
      name: node.area_name,
      path,
      lat: node.metadata?.lat ?? null,
      lng: node.metadata?.lng ?? null,
      source: 'openbeta',
      routes: node.climbs.map((c) => ({
        id: c.id,
        name: c.name,
        grade: c.grades?.yds || c.grades?.vscale || null,
        type: primaryType(c.type),
        description: c.content?.description || '',
        source: 'openbeta',
      })),
    })
  }
  if (node.children) {
    for (const child of node.children) collectWalls(child, path, out)
  }
}

async function main() {
  const query = buildAreaQuery(6)
  const walls = []
  for (const name of SEED_AREAS) {
    process.stdout.write(`Fetching "${name}"... `)
    const data = await gql(query, { name })
    const before = walls.length
    for (const area of data.areas) collectWalls(area, [], walls)
    console.log(`${walls.length - before} walls`)
  }

  // De-duplicate walls (seeded regions can share sub-areas / fuzzy matches).
  const byId = new Map()
  for (const w of walls) if (!byId.has(w.id)) byId.set(w.id, w)
  const unique = [...byId.values()]
  if (walls.length !== unique.length) {
    console.log(`Removed ${walls.length - unique.length} duplicate walls.`)
  }

  // Drop walls without usable coordinates — they can't be placed on the map.
  const placeable = unique.filter((w) => w.lat != null && w.lng != null)
  const dropped = unique.length - placeable.length
  if (dropped > 0) console.log(`Skipped ${dropped} walls with no coordinates.`)

  const routeCount = placeable.reduce((n, w) => n + w.routes.length, 0)
  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: 'openbeta',
    seededAreas: SEED_AREAS,
    wallCount: placeable.length,
    routeCount,
    walls: placeable,
  }

  const here = dirname(fileURLToPath(import.meta.url))
  const outPath = join(here, '..', 'src', 'data', 'seed', 'western-co.json')
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, JSON.stringify(snapshot, null, 2))
  console.log(`\nWrote ${placeable.length} walls / ${routeCount} routes to ${outPath}`)
}

main().catch((err) => {
  console.error('\nFetch failed:', err.message)
  process.exit(1)
})
