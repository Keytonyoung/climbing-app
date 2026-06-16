// Swipe/drag-down-to-dismiss for bottom sheets. Spread the returned props onto
// the `.sheet` element: <div className="sheet" {...useSheetDismiss(onClose)}>.
//
// Uses Pointer Events (work for touch AND mouse), so no ref is needed — scroll
// position is read from the event target. A drag only starts at the top of the
// sheet's scroll and not on an interactive control, so content still scrolls and
// taps/inputs still work. Dragging down past a threshold dismisses.

import { useState } from 'react'

const THRESHOLD = 90 // px

export function useSheetDismiss(onDismiss) {
  const [drag, setDrag] = useState(null) // { startY, dy } | null

  function onPointerDown(e) {
    if (e.currentTarget.scrollTop > 0) return
    if (e.target.closest('button, input, textarea, a, select')) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ startY: e.clientY, dy: 0 })
  }
  function onPointerMove(e) {
    setDrag((d) => {
      if (!d) return d
      const dy = e.clientY - d.startY
      return { ...d, dy: dy > 0 ? dy : 0 }
    })
  }
  function onPointerUp() {
    setDrag((d) => {
      if (d && d.dy > THRESHOLD) onDismiss()
      return null
    })
  }

  const dy = drag?.dy || 0
  const style = dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => setDrag(null),
    style,
  }
}
