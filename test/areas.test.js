import { describe, it, expect, beforeAll } from 'vitest'
import { initSeed, getWalls } from '../src/data/routes'
import { deriveAreaName } from '../src/data/areas'

describe('deriveAreaName', () => {
  beforeAll(async () => {
    await initSeed()
  })

  it('names a box after the dominant root area of the walls inside it', () => {
    const w = getWalls().find((x) => x.path?.[0])
    const pad = 0.01
    const name = deriveAreaName({
      west: w.lng - pad,
      south: w.lat - pad,
      east: w.lng + pad,
      north: w.lat + pad,
    })
    expect(name).toBe(w.path[0]) // the sampled wall's root area dominates its own box
  })

  it('falls back when the box contains no walls', () => {
    expect(deriveAreaName({ west: 100, south: -80, east: 101, north: -79 })).toBe('Saved area')
  })
})
