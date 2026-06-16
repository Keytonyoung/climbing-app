// Drag-the-handle-down-to-dismiss for bottom sheets.
//
// The drag is bound to the sheet's HANDLE (not the whole sheet) and the handle
// carries `touch-action: none`, so the browser can't steal the gesture for
// scrolling / pull-to-refresh (which was killing the drag on short sheets). The
// sheet body keeps normal scrolling.
//
// Usage:
//   const drag = useSheetDismiss(onClose)
//   <div className="sheet" style={drag.style}>
//     <div className="sheet-handle" {...drag.handleProps} />
//     ...
//   </div>

import { useRef, useState } from 'react'

const THRESHOLD = 80 // px

export function useSheetDismiss(onDismiss) {
  const startY = useRef(null)
  const dyRef = useRef(0)
  const [dy, setDy] = useState(0)

  const handleProps = {
    style: { touchAction: 'none', cursor: 'grab' },
    onPointerDown(e) {
      startY.current = e.clientY
      dyRef.current = 0
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    },
    onPointerMove(e) {
      if (startY.current == null) return
      const d = e.clientY - startY.current
      dyRef.current = d > 0 ? d : 0
      setDy(dyRef.current)
    },
    onPointerUp() {
      if (startY.current == null) return
      const shouldDismiss = dyRef.current > THRESHOLD
      startY.current = null
      dyRef.current = 0
      setDy(0)
      if (shouldDismiss) onDismiss?.()
    },
    onPointerCancel() {
      startY.current = null
      dyRef.current = 0
      setDy(0)
    },
  }

  const style = dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined
  return { handleProps, style }
}
