import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadVideo } from '../api'
import VideoPreview from '../components/VideoPreview'
import FeedbackReport from '../components/FeedbackReport'
import Spinner from '../components/Spinner'

const STATES = {
  IDLE: 'IDLE',
  CAMERA: 'CAMERA',
  COUNTDOWN: 'COUNTDOWN',
  RECORDING: 'RECORDING',
  ANALYZING: 'ANALYZING',
  FEEDBACK: 'FEEDBACK',
  ERROR: 'ERROR',
}

const MIN_CLIP_SEC = 3
const MAX_FILE_BYTES = 100 * 1024 * 1024
const COUNTDOWN_SEC = 10
const MAX_DURATION_SEC = 120

function selectMimeType() {
  for (const t of ['video/mp4', 'video/webm;codecs=vp9', 'video/webm']) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

export default function CheckPage() {
  const [appState, setAppState] = useState(STATES.IDLE)
  const [error, setError] = useState(null)
  const [report, setReport] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [showNoMovement, setShowNoMovement] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const blobRef = useRef(null)
  const mimeRef = useRef('')
  const countdownTimerRef = useRef(null)
  const elapsedTimerRef = useRef(null)
  const autoStopRef = useRef(null)
  const startTimeRef = useRef(0)
  const motionIntervalRef = useRef(null)
  const motionPrevRef = useRef(null)
  const motionDiffsRef = useRef([])
  const motionStartRef = useRef(0)
  const motionLastStateRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [appState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      clearInterval(countdownTimerRef.current)
      clearInterval(elapsedTimerRef.current)
      clearTimeout(autoStopRef.current)
      clearInterval(motionIntervalRef.current)
    }
  }, [])

  const showError = useCallback((msg) => {
    setError(msg)
    setAppState(STATES.ERROR)
  }, [])

  const handleOpenCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setAppState(STATES.CAMERA)
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showError('Camera access is required. Please allow camera permission and try again.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        showError('No camera was found on this device.')
      } else {
        showError(`Camera error: ${err.message}`)
      }
    }
  }, [showError])

  const handleCloseCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setAppState(STATES.IDLE)
  }, [])

  const handleStartRecording = useCallback(() => {
    if (!streamRef.current) { showError('Camera stream is not available.'); return }
    let remaining = COUNTDOWN_SEC
    setCountdown(remaining)
    setAppState(STATES.COUNTDOWN)
    countdownTimerRef.current = setInterval(() => {
      remaining--
      if (remaining > 0) { setCountdown(remaining) }
      else {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
        setCountdown(null)
        beginRecording()
      }
    }, 1000)
  }, [showError])

  const handleCancelCountdown = useCallback(() => {
    clearInterval(countdownTimerRef.current)
    countdownTimerRef.current = null
    setCountdown(null)
    setAppState(STATES.CAMERA)
  }, [])

  const beginRecording = useCallback(() => {
    chunksRef.current = []
    blobRef.current = null
    mimeRef.current = selectMimeType()
    const options = mimeRef.current ? { mimeType: mimeRef.current } : {}
    const mr = new MediaRecorder(streamRef.current, options)
    recorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      clearTimeout(autoStopRef.current)
      clearInterval(elapsedTimerRef.current)
      stopMotionDetector()
      const blob = new Blob(chunksRef.current, { type: mimeRef.current })
      blobRef.current = blob
      onRecordingStopped(blob, mimeRef.current)
    }
    mr.start(1000)
    setAppState(STATES.RECORDING)
    startTimeRef.current = Date.now()
    setElapsed(0)
    setShowNoMovement(false)
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    autoStopRef.current = setTimeout(() => handleStopRecording(), MAX_DURATION_SEC * 1000)
    startMotionDetector()
  }, [])

  const handleStopRecording = useCallback(() => {
    clearTimeout(autoStopRef.current)
    clearInterval(elapsedTimerRef.current)
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
  }, [])

  const onRecordingStopped = useCallback((blob, mimeType) => {
    setShowNoMovement(false)
    if (!blob || blob.size === 0) { showError('Recording failed — no video data was captured.'); return }
    const elapsedSec = (Date.now() - startTimeRef.current) / 1000
    if (elapsedSec < MIN_CLIP_SEC) { showError('Recording is too short. Please record for at least 3 seconds.'); return }
    if (blob.size > MAX_FILE_BYTES) { showError('Recording is too large (over 100 MB).'); return }
    submitForAnalysis(blob, mimeType)
  }, [showError])

  const startMotionDetector = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 120; canvas.height = 90
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    motionPrevRef.current = null; motionDiffsRef.current = []; motionLastStateRef.current = null
    motionStartRef.current = Date.now()
    motionIntervalRef.current = setInterval(() => {
      if (!videoRef.current) return
      ctx.drawImage(videoRef.current, 0, 0, 120, 90)
      const data = ctx.getImageData(24, 18, 72, 54).data
      if (motionPrevRef.current) {
        const prev = motionPrevRef.current
        let diff = 0, count = 0
        for (let i = 0; i < prev.length; i += 4) {
          diff += Math.abs(prev[i]-data[i]) + Math.abs(prev[i+1]-data[i+1]) + Math.abs(prev[i+2]-data[i+2])
          count++
        }
        const avg = count > 0 ? diff / (count * 3) : 0
        motionDiffsRef.current.push(avg)
        if (motionDiffsRef.current.length > 3) motionDiffsRef.current.shift()
      }
      motionPrevRef.current = new Uint8ClampedArray(data)
      if (Date.now() - motionStartRef.current < 2500) return
      const diffs = motionDiffsRef.current
      if (diffs.length < 2) { if (motionLastStateRef.current !== false) { motionLastStateRef.current = false; setShowNoMovement(true) }; return }
      const rollAvg = diffs.reduce((a, b) => a + b, 0) / diffs.length
      const hasMotion = rollAvg > 3
      if (hasMotion !== motionLastStateRef.current) { motionLastStateRef.current = hasMotion; setShowNoMovement(!hasMotion) }
    }, 500)
  }, [])

  const stopMotionDetector = useCallback(() => {
    clearInterval(motionIntervalRef.current); motionIntervalRef.current = null
    motionPrevRef.current = null; motionDiffsRef.current = []; motionLastStateRef.current = null
    setShowNoMovement(false)
  }, [])

  const submitForAnalysis = useCallback(async (blob, mimeType) => {
    setAppState(STATES.ANALYZING); setReport(null)
    try {
      const result = await uploadVideo(blob, mimeType)
      setReport(result); setAppState(STATES.FEEDBACK)
    } catch (err) { showError(err.message) }
  }, [showError])

  const handleRecordAgain = useCallback(() => { setReport(null); setError(null); setAppState(STATES.CAMERA) }, [])

  const handleRetry = useCallback(() => {
    const blob = blobRef.current, mimeType = mimeRef.current
    if (!blob) { showError('No recording available to retry.'); return }
    submitForAnalysis(blob, mimeType)
  }, [submitForAnalysis, showError])

  const isVideoVisible = [STATES.CAMERA, STATES.COUNTDOWN, STATES.RECORDING].includes(appState)

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-6">
      {/* Page header */}
      <div className="w-full max-w-2xl mb-6 text-center">
        <h2 className="text-2xl font-bold text-white">Check Your Form</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Open your camera, record your exercise, and get AI-powered feedback.
        </p>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-5">
        {/* Video preview — larger */}
        {isVideoVisible && (
          <VideoPreview
            ref={videoRef}
            countdown={countdown}
            isRecording={appState === STATES.RECORDING}
            elapsed={elapsed}
            showNoMovement={showNoMovement}
          />
        )}

        {/* Idle state — big CTA */}
        {appState === STATES.IDLE && (
          <div className="flex flex-col items-center gap-4 py-12 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30">
            <span className="text-5xl">📹</span>
            <p className="text-sm text-zinc-400">Ready to check your form?</p>
            <button onClick={handleOpenCamera} className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer">
              Open Camera
            </button>
          </div>
        )}

        {/* Controls */}
        {appState !== STATES.IDLE && (
          <div className="flex flex-wrap justify-center gap-3">
            {appState === STATES.CAMERA && (
              <>
                <button onClick={handleStartRecording} className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer">
                  🔴 Start Recording
                </button>
                <button onClick={handleCloseCamera} className="rounded-xl bg-zinc-700 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-600 transition-colors cursor-pointer">
                  Close Camera
                </button>
              </>
            )}
            {appState === STATES.COUNTDOWN && (
              <button onClick={handleCancelCountdown} className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition-colors cursor-pointer">
                Cancel Countdown
              </button>
            )}
            {appState === STATES.RECORDING && (
              <button onClick={handleStopRecording} className="rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer">
                ⏹ Stop Recording
              </button>
            )}
            {appState === STATES.ERROR && (
              <>
                <button onClick={handleRecordAgain} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer">
                  Record Again
                </button>
                <button onClick={handleRetry} className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition-colors cursor-pointer">
                  Retry Analysis
                </button>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {appState === STATES.ERROR && error && (
          <div role="alert" className="rounded-xl bg-red-900/80 border border-red-800 px-5 py-4 text-center text-sm text-white font-medium">
            {error}
          </div>
        )}

        {/* Loading */}
        {appState === STATES.ANALYZING && <Spinner />}

        {/* Feedback */}
        {appState === STATES.FEEDBACK && (
          <FeedbackReport report={report} onRecordAgain={handleRecordAgain} />
        )}
      </div>
    </div>
  )
}
