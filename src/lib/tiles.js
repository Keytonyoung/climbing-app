// Prefetch the map tiles for the current view so the basemap survives offline.
// We just fetch each tile URL — the service worker (vite-plugin-pwa runtime
// caching, see vite.config.js) stores the responses, so a later offline visit
// serves them from cache. Glyphs/sprites/style are already cached on first load.

function lngLatToTile(lng, lat, z) {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n)
  const clamp = (v) => Math.max(0, Math.min(n - 1, v))
  return { x: clamp(x), y: clamp(y) }
}

/**
 * Download tiles covering the current viewport from the current zoom up to
 * `extraZoom` levels deeper (capped). Calls onProgress(done, total).
 * Returns the number of tiles fetched.
 */
export async function downloadArea(map, { extraZoom = 2, maxTiles = 1500, onProgress } = {}) {
  const bounds = map.getBounds()
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  const z0 = Math.floor(map.getZoom())
  const maxZ = Math.min(z0 + extraZoom, 16)

  // Collect resolved {z}/{x}/{y} templates from the style's vector/raster sources.
  const style = map.getStyle()
  const templates = []
  for (const id of Object.keys(style.sources || {})) {
    const src = map.getSource(id)
    // Only the vector basemap — skip the low-zoom raster (404s at crag zooms)
    // and the satellite layer (huge; intentionally online-only).
    if (src?.type === 'vector' && src?.tiles?.length) templates.push(...src.tiles)
  }
  if (!templates.length) throw new Error('No downloadable tile source found.')

  const urls = []
  for (let z = z0; z <= maxZ && urls.length < maxTiles; z++) {
    const tl = lngLatToTile(sw.lng, ne.lat, z) // top-left
    const br = lngLatToTile(ne.lng, sw.lat, z) // bottom-right
    for (let x = tl.x; x <= br.x; x++) {
      for (let y = tl.y; y <= br.y; y++) {
        for (const t of templates) {
          urls.push(t.replace('{z}', z).replace('{x}', x).replace('{y}', y))
        }
      }
    }
  }

  const list = urls.slice(0, maxTiles)
  const total = list.length
  let done = 0
  const next = () => list.shift()
  const worker = async () => {
    let u
    while ((u = next())) {
      try {
        await fetch(u, { mode: 'cors' })
      } catch {
        /* ignore individual tile failures */
      }
      done++
      onProgress?.(done, total)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  return total
}
