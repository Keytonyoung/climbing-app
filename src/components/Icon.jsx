// The app's icon set. One consistent, stroke-based family (Lucide-style
// geometry) instead of platform emoji, which render differently on every
// device and cheapen the UI. Icons inherit currentColor so they follow the
// palette wherever they're placed.

const PATHS = {
  // activity feed (rss)
  feed: (
    <>
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  // filter (sliders)
  filter: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2.2" fill="var(--color-surface, #fff)" />
      <circle cx="15" cy="12" r="2.2" fill="var(--color-surface, #fff)" />
      <circle cx="7" cy="18" r="2.2" fill="var(--color-surface, #fff)" />
    </>
  ),
  // add pin
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  // trail (footprints simplified: a winding path)
  trail: (
    <>
      <circle cx="6" cy="19" r="2.6" />
      <circle cx="18" cy="5" r="2.6" />
      <path d="M8.6 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.4" />
    </>
  ),
  // directions (navigation arrow)
  directions: <polygon points="3 11 22 2 13 21 11 13 3 11" />,
  // share (three nodes)
  share: (
    <>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <line x1="8.4" y1="10.8" x2="15.6" y2="6.2" />
      <line x1="8.4" y1="13.2" x2="15.6" y2="17.8" />
    </>
  ),
  // admin shield
  shield: <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-3 8 3Z" />,
  // save offline (download)
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  // basemap layers (satellite toggle)
  layers: (
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 12 12 17 22 12" />
      <polyline points="2 17 12 22 22 17" />
    </>
  ),
  // location pin
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  // use-my-location (crosshair)
  locate: (
    <>
      <circle cx="12" cy="12" r="7" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  // wall / mountain
  mountain: <path d="m8 3 4 8 5-5 5 15H2L8 3Z" />,
  // The iOS Safari "Share" glyph, drawn as users actually see it (box with an
  // arrow leaving the top). "the box with an arrow" is the step people get
  // stuck on, so we show it rather than describe it.
  'ios-share': (
    <>
      <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" />
      <polyline points="8.5 6.5 12 3 15.5 6.5" />
      <line x1="12" y1="3" x2="12" y2="14" />
    </>
  ),
  // The Android/Chrome overflow menu glyph (three vertical dots).
  'menu-dots': (
    <>
      <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  // add photo (camera)
  camera: (
    <>
      <path d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5L14.5 4Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
}

export default function Icon({ name, size = 18, strokeWidth = 2, className }) {
  const paths = PATHS[name]
  if (!paths) return null
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  )
}
