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

/** Whether storage is already persistent (no prompt). */
export async function isStoragePersisted() {
  try {
    return !!navigator.storage?.persisted && (await navigator.storage.persisted())
  } catch {
    return false
  }
}

/** Rough usage/quota, for surfacing how much is stored offline. */
export async function storageEstimate() {
  try {
    if (!navigator.storage?.estimate) return null
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usage, quota }
  } catch {
    return null
  }
}
