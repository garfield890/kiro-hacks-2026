import { useRef, useState, useCallback } from 'react'

function selectMimeType() {
  const candidates = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm']
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return ''
}

/**
 * Hook to manage countdown + MediaRecorder.
 */
export function useRecorder() {
  const [countdown, setCountdown] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const blobRef = useRef(null)
  const mimeRef = useRef('')
  const countdownRef = useRef(null)
  const autoStopRef = useRef(null)
  const elapsedRef = useRef(null)
  const startTimeRef = useRef(0)

  const startCountdown = useCallback((stream, { onComplete, countdownSec = 10 }) => {
    let remaining = countdownSec
    setCountdown(remaining)

    countdownRef.current = setInterval(() => {
      remaining--
      if (remaining > 0) {
        setCountdown(remaining)
      } else {
        clearInterval(countdownRef.current)
        countdownRef.current = null
        setCountdown(null)
        onComplete()
      }
    }, 1000)
  }, [])

  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setCountdown(null)
  }, [])

  const startRecording = useCallback((stream, { onStop, maxDuration = 120 }) => {
    chunksRef.current = []
    blobRef.current = null
    mimeRef.current = selectMimeType()

    const options = mimeRef.current ? { mimeType: mimeRef.current } : {}
    const mr = new MediaRecorder(stream, options)
    recorderRef.current = mr

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.onstop = () => {
      clearTimeout(autoStopRef.current)
      clearInterval(elapsedRef.current)
      blobRef.current = new Blob(chunksRef.current, { type: mimeRef.current })
      setIsRecording(false)
      if (onStop) onStop()
    }

    mr.start(1000)
    setIsRecording(true)
    startTimeRef.current = Date.now()
    setElapsed(0)

    elapsedRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    autoStopRef.current = setTimeout(() => {
      stopRecording()
    }, maxDuration * 1000)
  }, [])

  const stopRecording = useCallback(() => {
    clearTimeout(autoStopRef.current)
    clearInterval(elapsedRef.current)
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }, [])

  const getBlob = useCallback(() => blobRef.current, [])
  const getMimeType = useCallback(() => mimeRef.current, [])
  const getStartTime = useCallback(() => startTimeRef.current, [])

  return {
    countdown,
    isRecording,
    elapsed,
    startCountdown,
    cancelCountdown,
    startRecording,
    stopRecording,
    getBlob,
    getMimeType,
    getStartTime,
  }
}
