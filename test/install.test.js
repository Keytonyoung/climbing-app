// @vitest-environment jsdom
//
// Install-path detection, against real user-agent strings. Getting this wrong
// is silent and expensive: showing iPhone-in-Chrome users the Safari steps
// sends them hunting for a menu item that isn't there, which is exactly the
// drop-off that prompted this feature.
import { describe, it, expect } from 'vitest'
import { getPlatform } from '../src/lib/install'

function pretendToBe(ua, { platform = '', maxTouchPoints = 0 } = {}) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => ua })
  Object.defineProperty(navigator, 'platform', { configurable: true, get: () => platform })
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => maxTouchPoints })
}

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.6045.109 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/119.0 Mobile/15E148 Safari/605.1.15',
  ipadSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  desktopMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
}

describe('getPlatform', () => {
  it('detects iPhone Safari (the one path that can actually install)', () => {
    pretendToBe(UA.iphoneSafari)
    expect(getPlatform()).toBe('ios-safari')
  })

  it('detects iPhone Chrome as ios-other, so we tell them to switch to Safari', () => {
    pretendToBe(UA.iphoneChrome)
    expect(getPlatform()).toBe('ios-other')
  })

  it('detects iPhone Firefox as ios-other', () => {
    pretendToBe(UA.iphoneFirefox)
    expect(getPlatform()).toBe('ios-other')
  })

  it('detects iPadOS Safari, which masquerades as a Mac', () => {
    pretendToBe(UA.ipadSafari, { platform: 'MacIntel', maxTouchPoints: 5 })
    expect(getPlatform()).toBe('ios-safari')
  })

  it('detects Android', () => {
    pretendToBe(UA.androidChrome)
    expect(getPlatform()).toBe('android')
  })

  it('detects desktop', () => {
    pretendToBe(UA.desktopChrome)
    expect(getPlatform()).toBe('desktop')
  })

  it('does not mistake a real Mac (no touch) for an iPad', () => {
    pretendToBe(UA.desktopMac, { platform: 'MacIntel', maxTouchPoints: 0 })
    expect(getPlatform()).toBe('desktop')
  })
})
