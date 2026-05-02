import { useRef, useState, useCallback } from 'react'

/**
 * Hook to manage camera stream lifecycle.
 * open() returns { success, error } so callers can act immediately.
 */
export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsOpen(true)
      return { success: true, error: null }
    } catch (err) {
      let msg
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera access is required. Please allow camera permission and try again.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera was found on this device.'
      } else {
        msg = `Camera error: ${err.message}`
      }
      return { success: false, error: msg }
    }
  }, [])

  const close = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsOpen(false)
  }, [])

  const getStream = useCallback(() => streamRef.current, [])

  return { videoRef, isOpen, open, close, getStream }
}
