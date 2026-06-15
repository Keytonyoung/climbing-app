// Build and share deep links that open the app to a specific wall (and route).
// Powers the "I did this yesterday, go check it out" flow.

export function shareUrl({ wallId, routeId } = {}) {
  const base = `${location.origin}${import.meta.env.BASE_URL}`
  const p = new URLSearchParams()
  if (wallId) p.set('wall', wallId)
  if (routeId) p.set('route', routeId)
  const qs = p.toString()
  return qs ? `${base}?${qs}` : base
}

/** Native share sheet if available (mobile), else copy to clipboard.
 *  Returns 'shared' | 'copied' | 'failed'. */
export async function shareOrCopy(url, title) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch {
      /* user cancelled or share failed — fall through to copy */
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
