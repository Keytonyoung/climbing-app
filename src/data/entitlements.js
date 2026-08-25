// Entitlement seam (monetization, designed-toward-not-activated, see
// docs/growth-architecture-plan.md §5/§11). Everything is free right now; every
// premium-capable action is routed through one predicate so a future freemium
// tier (e.g. paid offline downloads, the AllTrails model) becomes a change HERE,
// not a refactor across the UI.

/** May this user download an area for offline use? Free for everyone today. */
// eslint-disable-next-line no-unused-vars
export function canDownloadArea(user) {
  return true
}
