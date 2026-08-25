// Analytics — a deliberately tiny, cookieless layer. We track ONLY the handful of
// events that map to the growth plan's evidence gates (docs/growth-architecture-
// plan.md §8/§11c): sign_up, area_downloaded, contribution_created, share.
// Pageviews/weekly-active come free from the Umami script. No PII, no event soup.
//
// track() is a safe no-op until the Umami script is loaded (its instance lives
// wherever we host it — a tomorrow blocker). Wiring the call sites now means we
// just drop in the script + website id to switch analytics on.

// The only events we send. Keeping them in one list stops the taxonomy sprawling.
export const EVENTS = {
  SIGN_UP: 'sign_up',
  AREA_DOWNLOADED: 'area_downloaded',
  CONTRIBUTION_CREATED: 'contribution_created',
  SHARE: 'share',
  // Added when home-screen install turned out to be a real drop-off point:
  // installs are the top of the retention funnel (and protect offline storage),
  // so the conversion is worth measuring.
  INSTALLED: 'installed',
}

export function track(event, props) {
  try {
    // Umami exposes window.umami.track once its script is present.
    if (typeof window !== 'undefined' && window.umami?.track) {
      window.umami.track(event, props)
    }
  } catch {
    /* analytics must never break the app */
  }
}
