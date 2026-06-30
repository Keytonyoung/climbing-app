import { describe, it, expect } from 'vitest'
import { bucketGrades, hardestLabel } from '../src/data/pyramid'

describe('bucketGrades', () => {
  it('splits YDS and V scales and counts per bucket', () => {
    const { yds, v, total } = bucketGrades(['5.10a', '5.10d', '5.8', 'V3', 'V3', 'V5'])
    expect(yds.get(10)).toBe(2) // 5.10a and 5.10d share the 5.10 bucket
    expect(yds.get(8)).toBe(1)
    expect(v.get(3)).toBe(2)
    expect(v.get(5)).toBe(1)
    expect(total).toBe(6)
  })

  it('ignores ungradeable / empty entries', () => {
    const { total } = bucketGrades(['', null, undefined, 'project'])
    expect(total).toBe(0)
  })
})

describe('hardestLabel', () => {
  it('formats the hardest of each scale', () => {
    const { yds, v } = bucketGrades(['5.9', '5.11c', 'V2', 'V7'])
    expect(hardestLabel({ yds, v })).toBe('5.11 · V7')
  })
  it('is empty with no grades', () => {
    const { yds, v } = bucketGrades([])
    expect(hardestLabel({ yds, v })).toBe('')
  })
})
