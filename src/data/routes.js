// The data layer. UI components call ONLY these functions — never the seed
// JSON, the OpenBeta API, or storage directly. When local storage is later
// replaced by a backend (CLAUDE.md section 4, rule 2), only this file changes.

import seed from './seed/western-co.json'

/** Metadata about the bundled snapshot (when it was fetched, counts, etc.). */
export function getSeedInfo() {
  return {
    generatedAt: seed.generatedAt,
    source: seed.source,
    seededAreas: seed.seededAreas,
    wallCount: seed.wallCount,
    routeCount: seed.routeCount,
  }
}

/** All walls (crags), each with its list of routes. */
export function getWalls() {
  return seed.walls
}

/** A single wall by id, or undefined. */
export function getWall(id) {
  return seed.walls.find((w) => w.id === id)
}

/**
 * Walls as a GeoJSON FeatureCollection for MapLibre. Each feature is one wall;
 * route data rides along in properties (stringified — GeoJSON props must be
 * primitives) so a click handler can render the route list without a lookup.
 */
export function getWallsGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: getWalls().map((wall) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [wall.lng, wall.lat] },
      properties: {
        id: wall.id,
        name: wall.name,
        path: wall.path.join(' › '),
        routeCount: wall.routes.length,
        routes: JSON.stringify(wall.routes),
      },
    })),
  }
}
