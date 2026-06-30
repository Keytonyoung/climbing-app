import { describe, it, expect, beforeAll } from 'vitest'
import {
  parseYdsBase,
  parseVgrade,
  isDefaultFilter,
  getFilteredWalls,
  getAreaTargets,
  initSeed,
  getWalls,
  DEFAULT_FILTER,
} from '../src/data/routes'

describe('parseYdsBase', () => {
  it('parses the base number, ignoring letters and +/-', () => {
    expect(parseYdsBase('5.10c')).toBe(10)
    expect(parseYdsBase('5.9+')).toBe(9)
    expect(parseYdsBase('5.12')).toBe(12)
    expect(parseYdsBase('5.7')).toBe(7)
  })
  it('returns null for non-YDS grades', () => {
    expect(parseYdsBase('V4')).toBeNull()
    expect(parseYdsBase('')).toBeNull()
    expect(parseYdsBase(null)).toBeNull()
  })
})

describe('parseVgrade', () => {
  it('parses V grades including ranges and V-easy', () => {
    expect(parseVgrade('V4')).toBe(4)
    expect(parseVgrade('V10-11')).toBe(10)
    expect(parseVgrade('V-easy')).toBe(0)
    expect(parseVgrade('v3')).toBe(3)
  })
  it('returns null for non-V grades', () => {
    expect(parseVgrade('5.10a')).toBeNull()
    expect(parseVgrade(null)).toBeNull()
  })
})

describe('isDefaultFilter', () => {
  it('is true for the default and false when narrowed', () => {
    expect(isDefaultFilter(DEFAULT_FILTER)).toBe(true)
    expect(isDefaultFilter({ ...DEFAULT_FILTER, ydsMin: 8 })).toBe(false)
    expect(isDefaultFilter({ ...DEFAULT_FILTER, types: ['sport'] })).toBe(false)
  })
})

describe('seed-backed functions', () => {
  beforeAll(async () => {
    await initSeed()
  })

  it('loads a non-trivial seed', () => {
    expect(getWalls().length).toBeGreaterThan(100)
  })

  it('getFilteredWalls returns everything for the default filter', () => {
    expect(getFilteredWalls(DEFAULT_FILTER).length).toBe(getWalls().length)
  })

  it('getFilteredWalls(sport-only) carries only sport routes', () => {
    const walls = getFilteredWalls({ ...DEFAULT_FILTER, types: ['sport'] })
    for (const w of walls) {
      expect(w.routes.every((r) => r.type === 'sport')).toBe(true)
    }
  })

  it('getAreaTargets includes a wall inside the box and excludes far ones', () => {
    const w = getWalls()[0]
    const pad = 0.001
    const t = getAreaTargets({
      west: w.lng - pad,
      south: w.lat - pad,
      east: w.lng + pad,
      north: w.lat + pad,
    })
    expect(t.wallIds.has(w.id)).toBe(true)
    // A box on the other side of the planet contains nothing.
    const empty = getAreaTargets({ west: 100, south: -80, east: 101, north: -79 })
    expect(empty.wallIds.size).toBe(0)
  })
})
