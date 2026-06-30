import { describe, it, expect } from 'vitest'
import {
  haversineMeters,
  trackLength,
  formatDistance,
  getWallAccess,
} from '../src/data/tracks'

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters([-108.5, 39], [-108.5, 39])).toBe(0)
  })
  it('approximates a known short distance', () => {
    // ~0.01 deg latitude ≈ 1113 m.
    const d = haversineMeters([-108.5, 39.0], [-108.5, 39.01])
    expect(d).toBeGreaterThan(1080)
    expect(d).toBeLessThan(1140)
  })
})

describe('trackLength', () => {
  it('sums segment distances', () => {
    const a = haversineMeters([-108.5, 39.0], [-108.5, 39.01])
    const path = [[-108.5, 39.0], [-108.5, 39.01], [-108.5, 39.02]]
    expect(trackLength(path)).toBeCloseTo(a * 2, 0)
  })
})

describe('formatDistance', () => {
  it('uses feet under ~0.2 mi and miles above', () => {
    expect(formatDistance(100)).toMatch(/ft$/)
    expect(formatDistance(2000)).toMatch(/mi$/)
  })
})

describe('getWallAccess', () => {
  const wall = { id: 'w1', lng: -108.5, lat: 39.0 }
  const near = { id: 'p-near', category: 'parking', label: 'Lot', lng: -108.5005, lat: 39.0005 }
  const far = { id: 'p-far', category: 'parking', label: 'Far', lng: -100.0, lat: 39.0 }
  const linkedFar = { id: 'p-linked', category: 'trailhead', label: 'TH', lng: -99.0, lat: 39.0 }

  it('includes nearby pins and excludes distant ones (proximity fallback)', () => {
    const out = getWallAccess(wall, [near, far], [])
    const ids = out.map((a) => a.pin.id)
    expect(ids).toContain('p-near')
    expect(ids).not.toContain('p-far')
    expect(out.find((a) => a.pin.id === 'p-near').linked).toBe(false)
  })

  it('includes a trail-linked pin at ANY distance, ranked first', () => {
    const tracks = [{ id: 't1', start: { kind: 'wall', id: 'w1' }, end: { kind: 'pin', id: 'p-linked' } }]
    const out = getWallAccess(wall, [near, linkedFar], tracks)
    expect(out[0].pin.id).toBe('p-linked') // linked first
    expect(out[0].linked).toBe(true)
    expect(out.map((a) => a.pin.id)).toContain('p-near')
  })

  it('does not duplicate a pin that is both linked and nearby', () => {
    const tracks = [{ id: 't1', start: { kind: 'wall', id: 'w1' }, end: { kind: 'pin', id: 'p-near' } }]
    const out = getWallAccess(wall, [near], tracks)
    expect(out.length).toBe(1)
    expect(out[0].linked).toBe(true)
  })
})
