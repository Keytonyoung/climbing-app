// Photo failures used to surface raw browser text ("The source image could not
// be decoded"), which tells a climber nothing about what to do next. These pin
// the translation to advice, and pin the technical tail that makes a bug report
// diagnosable without a debugging session.
import { describe, it, expect } from 'vitest'
import { photoErrorMessage } from '../src/lib/image'

const tagged = (step, detail) => Object.assign(new Error('unsupported-image'), { step, detail })

describe('photoErrorMessage', () => {
  it('turns the real HEIC decode failure into advice', () => {
    const msg = photoErrorMessage(new DOMException('The source image could not be decoded'))
    expect(msg).toMatch(/format isn't supported/)
    expect(msg).toMatch(/JPEG or PNG/)
  })

  // An iPhone photo still sitting in iCloud reads back empty. That is a
  // different problem from a bad format and has a different fix.
  it('tells you to download an iCloud photo first when the file is empty', () => {
    const msg = photoErrorMessage(tagged('empty'))
    expect(msg).toMatch(/iCloud/)
    expect(msg).toMatch(/Photos app/)
    expect(msg).not.toMatch(/format isn't supported/)
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

  it('appends what actually failed, so a report is diagnosable', () => {
    const file = { type: 'image/heic', size: 2_400_000 }
    const msg = photoErrorMessage(tagged('decode', 'bitmap: InvalidStateError / img: Error'), file)
    expect(msg).toMatch(/image\/heic/)
    expect(msg).toMatch(/2344 KB/)
    expect(msg).toMatch(/decode/)
    expect(msg).toMatch(/img: Error/)
  })

  it('says so when the file type is missing entirely', () => {
    expect(photoErrorMessage(tagged('empty'), { type: '', size: 0 })).toMatch(/unknown type, 0 KB/)
  })
})

describe('HEIC handling', () => {
  it('tells you the converter could not load, not that the photo is bad', () => {
    const msg = photoErrorMessage(Object.assign(new Error('unsupported-image'), { step: 'heic-load' }))
    expect(msg).toMatch(/converter/)
    expect(msg).toMatch(/connection/)
    expect(msg).not.toMatch(/format isn't supported/)
  })

  it('suggests Most Compatible when conversion itself fails', () => {
    const msg = photoErrorMessage(Object.assign(new Error('unsupported-image'), { step: 'heic-decode' }))
    expect(msg).toMatch(/Most Compatible/)
  })
})
