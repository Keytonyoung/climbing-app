// Persistent-storage helpers. Offline is the whole point of the app, but browsers
// (iOS Safari especially) can EVICT IndexedDB + Cache under storage pressure or
// after ~7 days of inactivity. Requesting "persistent" storage makes eviction far
// less likely. It's the cheapest, highest-leverage protection for the offline
// promise. Installed PWAs are much more likely to be granted it, which is why we
// nudge installation alongside this.

/** Ask the browser to make our storage persistent. Returns true if granted.
 *  Safe to call repeatedly; resolves false where the API is unavailable. */
export async function ensurePersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

