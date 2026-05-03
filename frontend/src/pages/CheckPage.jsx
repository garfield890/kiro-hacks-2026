import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadVideo } from '../api'
import VideoPreview from '../components/VideoPreview'
import FeedbackReport from '../components/FeedbackReport'
import Spinner from '../components/Spinner'
import checkBg from '../assets/check.jpg'

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
const MAX_DURATION_SEC = 60

function selectMimeType() {
  for (const t of ['video/mp4', 'video/webm;codecs=vp9', 'video/webm']) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

// Step indicator data
const STEPS = [
  { key: 'camera', label: 'Camera', states: ['CAMERA'] },
  { key: 'record', label: 'Record', states: ['COUNTDOWN', 'RECORDING'] },
  { key: 'analyze', label: 'Analyze', states: ['ANALYZING'] },
  { key: 'results', label: 'Results', states: ['FEEDBACK'] },
]

function getStepStatus(step, appState) {
  const idx = STEPS.findIndex(s => s.key === step.key)
  const currentIdx = STEPS.findIndex(s => s.states.includes(appState))
  if (currentIdx < 0) return 'upcoming'
  if (idx < currentIdx) return 'done'
  if (idx === currentIdx) return 'active'
  return 'upcoming'
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

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      clearInterval(countdownTimerRef.current)
      clearInterval(elapsedTimerRef.current)
      clearTimeout(autoStopRef.current)
      clearInterval(motionIntervalRef.current)
    }
  }, [])

  const showError = useCallback((msg) => { setError(msg); setAppState(STATES.ERROR) }, [])

  const handleOpenCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        }
      })
      streamRef.current = stream
      setAppState(STATES.CAMERA)
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') showError('Camera access is required. Please allow camera permission and try again.')
      else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') showError('No camera was found on this device.')
      else showError(`Camera error: ${err.message}`)
    }
  }, [showError])

  const handleCloseCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setAppState(STATES.IDLE)
  }, [])

  const handleStartRecording = useCallback(() => {
    if (!streamRef.current) { showError('Camera stream is not available.'); return }
    let remaining = COUNTDOWN_SEC
    setCountdown(remaining); setAppState(STATES.COUNTDOWN)
    countdownTimerRef.current = setInterval(() => {
      remaining--
      if (remaining > 0) setCountdown(remaining)
      else { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; setCountdown(null); beginRecording() }
    }, 1000)
  }, [showError])

  const handleCancelCountdown = useCallback(() => {
    clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; setCountdown(null); setAppState(STATES.CAMERA)
  }, [])

  const beginRecording = useCallback(() => {
    chunksRef.current = []; blobRef.current = null; mimeRef.current = selectMimeType()
    const options = mimeRef.current ? { mimeType: mimeRef.current } : {}
    const mr = new MediaRecorder(streamRef.current, options)
    recorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      clearTimeout(autoStopRef.current); clearInterval(elapsedTimerRef.current); stopMotionDetector()
      const blob = new Blob(chunksRef.current, { type: mimeRef.current }); blobRef.current = blob
      onRecordingStopped(blob, mimeRef.current)
    }
    mr.start(1000); setAppState(STATES.RECORDING); startTimeRef.current = Date.now(); setElapsed(0); setShowNoMovement(false)
    elapsedTimerRef.current = setInterval(() => { setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)) }, 1000)
    autoStopRef.current = setTimeout(() => handleStopRecording(), MAX_DURATION_SEC * 1000)
    startMotionDetector()
  }, [])

  const handleStopRecording = useCallback(() => {
    clearTimeout(autoStopRef.current); clearInterval(elapsedTimerRef.current)
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
  }, [])

  const onRecordingStopped = useCallback((blob, mimeType) => {
    setShowNoMovement(false)
    // Stop the camera after recording
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (!blob || blob.size === 0) { showError('Recording failed — no video data was captured.'); return }
    const elapsedSec = (Date.now() - startTimeRef.current) / 1000
    if (elapsedSec < MIN_CLIP_SEC) { showError('Recording is too short. Please record for at least 3 seconds.'); return }
    if (blob.size > MAX_FILE_BYTES) { showError('Recording is too large (over 100 MB).'); return }
    submitForAnalysis(blob, mimeType)
  }, [showError])

  const startMotionDetector = useCallback(() => {
    const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 90
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    motionPrevRef.current = null; motionDiffsRef.current = []; motionLastStateRef.current = null; motionStartRef.current = Date.now()
    motionIntervalRef.current = setInterval(() => {
      if (!videoRef.current) return
      ctx.drawImage(videoRef.current, 0, 0, 120, 90)
      const data = ctx.getImageData(24, 18, 72, 54).data
      if (motionPrevRef.current) {
        const prev = motionPrevRef.current; let diff = 0, count = 0
        for (let i = 0; i < prev.length; i += 4) { diff += Math.abs(prev[i]-data[i]) + Math.abs(prev[i+1]-data[i+1]) + Math.abs(prev[i+2]-data[i+2]); count++ }
        const avg = count > 0 ? diff / (count * 3) : 0; motionDiffsRef.current.push(avg)
        if (motionDiffsRef.current.length > 3) motionDiffsRef.current.shift()
      }
      motionPrevRef.current = new Uint8ClampedArray(data)
      if (Date.now() - motionStartRef.current < 2500) return
      const diffs = motionDiffsRef.current
      if (diffs.length < 2) { if (motionLastStateRef.current !== false) { motionLastStateRef.current = false; setShowNoMovement(true) }; return }
      const rollAvg = diffs.reduce((a, b) => a + b, 0) / diffs.length; const hasMotion = rollAvg > 3
      if (hasMotion !== motionLastStateRef.current) { motionLastStateRef.current = hasMotion; setShowNoMovement(!hasMotion) }
    }, 500)
  }, [])

  const stopMotionDetector = useCallback(() => {
    clearInterval(motionIntervalRef.current); motionIntervalRef.current = null
    motionPrevRef.current = null; motionDiffsRef.current = []; motionLastStateRef.current = null; setShowNoMovement(false)
  }, [])

  const submitForAnalysis = useCallback(async (blob, mimeType) => {
    setAppState(STATES.ANALYZING); setReport(null)
    try { const result = await uploadVideo(blob, mimeType); setReport(result); setAppState(STATES.FEEDBACK) }
    catch (err) { showError(err.message) }
  }, [showError])

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (100 MB)
    if (file.size > MAX_FILE_BYTES) {
      showError('File is too large — maximum size is 100 MB.')
      return
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime']
    if (!validTypes.includes(file.type)) {
      showError('Unsupported file type. Please upload an MP4, WebM, or MOV file.')
      return
    }

    // Check duration using a temporary video element
    const url = URL.createObjectURL(file)
    const tempVideo = document.createElement('video')
    tempVideo.preload = 'metadata'
    tempVideo.src = url

    tempVideo.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      if (tempVideo.duration > MAX_DURATION_SEC) {
        showError(`Video is too long (${Math.round(tempVideo.duration)}s). Maximum is ${MAX_DURATION_SEC} seconds.`)
        return
      }
      if (tempVideo.duration < MIN_CLIP_SEC) {
        showError(`Video is too short (${Math.round(tempVideo.duration)}s). Minimum is ${MIN_CLIP_SEC} seconds.`)
        return
      }
      // All good — submit for analysis
      submitForAnalysis(file, file.type)
    }

    tempVideo.onerror = () => {
      URL.revokeObjectURL(url)
      showError('Could not read the video file. Please try a different file.')
    }
  }, [showError, submitForAnalysis])

  const handleRecordAgain = useCallback(async () => {
    setReport(null)
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      })
      streamRef.current = stream
      setAppState(STATES.CAMERA)
    } catch (err) {
      showError(`Camera error: ${err.message}`)
    }
  }, [showError])

  const handleRetry = useCallback(() => {
    const blob = blobRef.current, mimeType = mimeRef.current
    if (!blob) { showError('No recording available to retry.'); return }
    submitForAnalysis(blob, mimeType)
  }, [submitForAnalysis, showError])

  const isVideoVisible = [STATES.CAMERA, STATES.COUNTDOWN, STATES.RECORDING].includes(appState)
  const showSteps = appState !== STATES.IDLE && appState !== STATES.ERROR

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${checkBg})` }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />
      </div>

    <div className="relative z-10 flex flex-1 flex-col items-center px-6 py-10 sm:px-8">
      {/* Page header */}
      <div className="w-full max-w-4xl mb-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
          Check Your Form
        </h2>
        <p className="mt-2 text-base font-light text-zinc-400 leading-relaxed tracking-wide max-w-xl">
          Open your camera, record your exercise, and get AI-powered feedback.
        </p>
      </div>

      {/* Step progress indicator */}
      {showSteps && (
        <div className="w-full max-w-4xl mb-8 animate-fade-in">
          <div className="flex items-center gap-0">
            {STEPS.map((step, i) => {
              const status = getStepStatus(step, appState)
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      status === 'done' ? 'bg-emerald-500 text-white scale-100' :
                      status === 'active' ? 'bg-blue-500 text-white ring-4 ring-blue-500/20 scale-110' :
                      'bg-zinc-800 text-zinc-500 border border-zinc-700 scale-100'
                    }`}>
                      {status === 'done' ? '✓' : i + 1}
                    </div>
                    <span className={`mt-1.5 text-[11px] font-medium tracking-wide transition-colors ${
                      status === 'done' ? 'text-emerald-400' :
                      status === 'active' ? 'text-white' :
                      'text-zinc-600'
                    }`}>{step.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 -mt-5 transition-colors duration-300 ${
                      getStepStatus(STEPS[i + 1], appState) === 'done' || getStepStatus(step, appState) === 'done'
                        ? 'bg-emerald-500/50' : 'bg-zinc-800'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="w-full max-w-4xl">
        {appState === STATES.IDLE && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Top row — Camera + Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Camera option */}
              <div className="flex flex-col items-center justify-center gap-6 py-14 rounded-2xl bg-zinc-900/75 border border-zinc-600/40 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_4px_16px_rgba(0,0,0,0.4)]">
                <div className="animate-float">
                  <div className="h-16 w-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center animate-glow-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                </div>
                <div className="text-center px-6">
                  <h3 className="text-base font-semibold text-white font-[family-name:var(--font-heading)]">Record Live</h3>
                  <p className="mt-1 text-xs text-zinc-400">Open your camera and record in real time.</p>
                </div>
                <button
                  onClick={handleOpenCamera}
                  className="rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 px-8 py-3 text-sm font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-blue-400 hover:to-blue-600 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                >
                  Open Camera
                </button>
              </div>

              {/* Upload option */}
              <div className="flex flex-col items-center justify-center gap-6 py-14 rounded-2xl bg-zinc-900/75 border border-zinc-600/40 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_4px_16px_rgba(0,0,0,0.4)]">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="text-center px-6">
                  <h3 className="text-base font-semibold text-white font-[family-name:var(--font-heading)]">Upload Video</h3>
                  <p className="mt-1 text-xs text-zinc-400">Upload a video file (max 60 seconds, 100 MB).</p>
                </div>
                <label className="rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-3 text-sm font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-emerald-400 hover:to-emerald-600 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
                  Choose File
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* Tips row */}
            <div className="rounded-2xl bg-zinc-900/75 border border-zinc-600/40 p-8 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_4px_12px_rgba(0,0,0,0.4)]">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-5 font-[family-name:var(--font-heading)]">
                Tips for best results
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { icon: '📐', text: 'Stand 6–8 feet from the camera' },
                  { icon: '💡', text: 'Use good, even lighting' },
                  { icon: '👤', text: 'Keep your full body in frame' },
                  { icon: '📱', text: 'Prop your device at chest height' },
                  { icon: '⏱️', text: 'Max 60 seconds per recording' },
                  { icon: '🔁', text: 'Record 3–5 reps for best accuracy' },
                ].map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 animate-fade-in-up"
                    style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                  >
                    <span className="text-sm shrink-0 mt-0.5">{tip.icon}</span>
                    <span className="text-xs text-zinc-300 leading-relaxed">{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Video + controls */}
        {isVideoVisible && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <VideoPreview
              ref={videoRef}
              countdown={countdown}
              isRecording={appState === STATES.RECORDING}
              elapsed={elapsed}
              showNoMovement={showNoMovement}
            />

            <div className="flex flex-wrap justify-center gap-4">
              {appState === STATES.CAMERA && (
                <>
                  <button onClick={handleStartRecording} className="rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-3.5 text-base font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-emerald-400 hover:to-emerald-600 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
                    🔴 Start Recording
                  </button>
                  <button onClick={handleCloseCamera} className="rounded-2xl bg-gradient-to-b from-zinc-600 to-zinc-800 px-8 py-3.5 text-base font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-zinc-500 hover:to-zinc-700 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
                    Close Camera
                  </button>
                </>
              )}
              {appState === STATES.COUNTDOWN && (
                <button onClick={handleCancelCountdown} className="rounded-2xl bg-gradient-to-b from-orange-500 to-orange-700 px-8 py-3.5 text-base font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-orange-400 hover:to-orange-600 transition-all duration-300 cursor-pointer active:translate-y-px">
                  Cancel Countdown
                </button>
              )}
              {appState === STATES.RECORDING && (
                <button onClick={handleStopRecording} className="rounded-2xl bg-gradient-to-b from-red-500 to-red-700 px-8 py-3.5 text-base font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-red-400 hover:to-red-600 transition-all duration-300 cursor-pointer active:translate-y-px">
                  ⏹ Stop Recording
                </button>
              )}
            </div>
          </div>
        )}

        {/* Analyzing */}
        {appState === STATES.ANALYZING && (
          <div className="animate-fade-in">
            <Spinner />
          </div>
        )}

        {/* Error */}
        {appState === STATES.ERROR && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up">
            <div role="alert" className="w-full rounded-2xl bg-gradient-to-b from-red-800 to-red-950 border border-red-700/40 px-6 py-5 text-center shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_4px_12px_rgba(0,0,0,0.4)]">
              <p className="text-base text-white font-medium">{error}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={handleRecordAgain} className="rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 px-8 py-3.5 text-base font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-blue-400 hover:to-blue-600 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
                Record Again
              </button>
              <label className="rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-3.5 text-base font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-emerald-400 hover:to-emerald-600 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
                Upload Again
                <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" className="hidden" onChange={handleFileUpload} />
              </label>
              <button onClick={handleRetry} className="rounded-2xl bg-gradient-to-b from-amber-500 to-amber-700 px-8 py-3.5 text-base font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-amber-400 hover:to-amber-600 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
                Retry Analysis
              </button>
            </div>
          </div>
        )}

        {/* Feedback */}
        {appState === STATES.FEEDBACK && (
          <FeedbackReport report={report} onRecordAgain={handleRecordAgain} onUploadAgain={handleFileUpload} />
        )}
      </div>
    </div>
    </div>
  )
}
