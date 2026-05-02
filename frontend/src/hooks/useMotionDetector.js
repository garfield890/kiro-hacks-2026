import { useRef, useCallback } from 'react'

/**
 * Hook for detecting motion in the center crop of a video element.
 */
export function useMotionDetector() {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const prevCropRef = useRef(null)
  const recentDiffsRef = useRef([])
  const intervalRef = useRef(null)
  const startTimeRef = useRef(0)
  const lastStateRef = useRef(null)

  const FW = 120
  const FH = 90
  const CROP_RATIO = 0.6
  const WINDOW_SIZE = 3
  const GRACE_MS = 2500
  const THRESHOLD = 3

  const start = useCallback((videoEl, onMotionChange) => {
    const canvas = document.createElement('canvas')
    canvas.width = FW
    canvas.height = FH
    canvasRef.current = canvas
    ctxRef.current = canvas.getContext('2d', { willReadFrequently: true })
    prevCropRef.current = null
    recentDiffsRef.current = []
    lastStateRef.current = null
    startTimeRef.current = Date.now()

    intervalRef.current = setInterval(() => {
      const ctx = ctxRef.current
      ctx.drawImage(videoEl, 0, 0, FW, FH)

      const cropW = Math.round(FW * CROP_RATIO)
      const cropH = Math.round(FH * CROP_RATIO)
      const cropX = Math.round((FW - cropW) / 2)
      const cropY = Math.round((FH - cropH) / 2)
      const cropData = ctx.getImageData(cropX, cropY, cropW, cropH).data

      if (prevCropRef.current) {
        const prev = prevCropRef.current
        let totalDiff = 0
        let count = 0
        for (let i = 0; i < prev.length; i += 4) {
          totalDiff += Math.abs(prev[i] - cropData[i])
          totalDiff += Math.abs(prev[i + 1] - cropData[i + 1])
          totalDiff += Math.abs(prev[i + 2] - cropData[i + 2])
          count++
        }
        const diff = count > 0 ? totalDiff / (count * 3) : 0

        const diffs = recentDiffsRef.current
        diffs.push(diff)
        if (diffs.length > WINDOW_SIZE) diffs.shift()
      }

      prevCropRef.current = new Uint8ClampedArray(cropData)

      const elapsed = Date.now() - startTimeRef.current
      if (elapsed < GRACE_MS) return

      const diffs = recentDiffsRef.current
      if (diffs.length < 2) {
        if (lastStateRef.current !== false) {
          lastStateRef.current = false
          onMotionChange(false)
        }
        return
      }

      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
      const hasMotion = avg > THRESHOLD

      if (hasMotion !== lastStateRef.current) {
        lastStateRef.current = hasMotion
        onMotionChange(hasMotion)
      }
    }, 500)
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    prevCropRef.current = null
    recentDiffsRef.current = []
    lastStateRef.current = null
  }, [])

  return { start, stop }
}
