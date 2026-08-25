// PWA installation: platform detection plus the browser's own one-tap install
// where it exists. Installing matters more for Cragward than for most web apps —
// an installed PWA gets far more durable storage, which is what stops iOS from
// evicting downloaded crags (see data/areas.js), and it launches full-screen.
//
// The listener is registered at import time because Chrome fires
// `beforeinstallprompt` early, often before React has mounted. Miss it and the
// one-tap install is gone for the whole session.

import { track, EVENTS } from './analytics'

let deferredPrompt = null
const listeners = new Set()

function notify() {
  for (const l of listeners) l()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // suppress Chrome's own mini-infobar; we ask in context
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    track(EVENTS.INSTALLED)
    notify()
  })
}

/** Subscribe to install-availability changes. Returns an unsubscribe fn. */
export function onInstallChange(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Can we show the browser's native one-tap install dialog right now? */
export function canPromptInstall() {
  return !!deferredPrompt
}

/** Show the native install dialog. 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable'
  const prompt = deferredPrompt
  deferredPrompt = null // a prompt event can only be used once
  notify()
  try {
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    return outcome
  } catch {
    return 'dismissed'
  }
}

/** Already running as an installed app? */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/**
 * Which install path applies: 'ios-safari' | 'ios-other' | 'android' | 'desktop'.
 *
 * The 'ios-other' case is the one that silently defeats people: on iPhone,
 * Add to Home Screen is a Safari feature. Someone browsing in Chrome or
 * Firefox on iOS follows "tap Share → Add to Home Screen", can't find it, and
 * gives up — so they need to be told to switch browsers first.
 */
export function getPlatform() {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  const ios =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios) {
    // Every iOS browser is WebKit, so sniff the wrapper: Chrome=CriOS,
    // Firefox=FxiOS, Edge=EdgiOS, Opera=OPiOS.
    const inSafari = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
    return inSafari ? 'ios-safari' : 'ios-other'
  }
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}
