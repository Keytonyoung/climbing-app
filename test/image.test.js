// Photo failures used to surface raw browser text ("The source image could not
// be decoded"), which tells a climber nothing about what to do next. These pin
// the translation to advice.
import { describe, it, expect } from 'vitest'
import { photoErrorMessage } from '../src/lib/image'

describe('photoErrorMessage', () => {
  it('turns the real HEIC decode failure into advice', () => {
    const msg = photoErrorMessage(new DOMException('The source image could not be decoded'))
    expect(msg).toMatch(/format isn't supported/)
    expect(msg).toMatch(/JPEG or PNG/)
    expect(msg).not.toMatch(/decoded/)
  })

  it('handles our own internal marker the same way', () => {
    expect(photoErrorMessage(new Error('unsupported-image'))).toMatch(/format isn't supported/)
  })

  it('explains an oversized upload', () => {
    expect(photoErrorMessage(new Error('exceeded the maximum allowed size'))).toMatch(/too large/)
  })

  it('points a rejected write at the hourly limit', () => {
    expect(photoErrorMessage(new Error('new row violates row-level security policy'))).toMatch(/hourly limit/)
  })

  it('says photos need signal when the network is the problem', () => {
    expect(photoErrorMessage(new TypeError('Failed to fetch'))).toMatch(/need signal/)
  })

  it('falls back to the raw message rather than hiding it', () => {
    expect(photoErrorMessage(new Error('something odd'))).toMatch(/something odd/)
  })
})
