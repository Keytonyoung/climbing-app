// Swipe-down-to-dismiss for bottom sheets. Spread the returned handlers + ref +
// style onto the `.sheet` element. Only dismisses when the drag starts at the
// top of the sheet's scroll (so dragging a scrolled sheet scrolls content), and
// only on a downward drag past a threshold.

import { useRef, useState } from 'react'

const THRESHOLD = 90 // px

export function useSheetDismiss(onDismiss) {
  const elRef = useRef(null)
  const startY = useRef(null)
  const atTop = useRef(true)
  const [dy, setDy] = useState(0)

  function onTouchStart(e) {
    startY.current = e.touches[0].clientY
    atTop.current = (elRef.current?.scrollTop || 0) <= 0
  }
  function onTouchMove(e) {
    if (startY.current == null || !atTop.current) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) setDy(delta) // only downward
  }
  function onTouchEnd() {
    if (dy > THRESHOLD) onDismiss()
    setDy(0)
    startY.current = null
  }

  // Only apply an inline transform while actively dragging, so the CSS slide-up
  // entry animation isn't overridden on mount.
  const style = dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined

  return { ref: elRef, onTouchStart, onTouchMove, onTouchEnd, style }
}
