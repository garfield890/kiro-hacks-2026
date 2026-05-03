import { forwardRef, useState } from 'react'

const MAX_DURATION = 60
const TIME_WARNING_AT = 50
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

const VideoPreview = forwardRef(function VideoPreview(
  { countdown, isRecording, elapsed, showNoMovement },
  ref
) {
  const [zoom, setZoom] = useState(1)

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0')
    const s = String(sec % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  const zoomIn = () => setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM))
  const zoomOut = () => setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM))
  const resetZoom = () => setZoom(1)

  const timeRemaining = MAX_DURATION - elapsed
  const showTimeWarning = isRecording && elapsed >= TIME_WARNING_AT

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_8px_24px_rgba(0,0,0,0.5),0_2px_4px_rgba(0,0,0,0.3)] border border-zinc-700/40 bg-zinc-900 animate-scale-in">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="w-full h-full object-cover transition-transform duration-200 ease-out"
        style={{ transform: `scale(${zoom})` }}
        aria-label="Live camera feed"
      />

      {/* Zoom controls — bottom right */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 animate-fade-in">
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="h-8 w-8 rounded-full bg-black/60 border border-white/15 text-white text-sm font-bold flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={resetZoom}
          className="h-8 min-w-[3rem] rounded-full bg-black/60 border border-white/15 text-white text-[10px] font-semibold flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer tabular-nums"
          aria-label="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="h-8 w-8 rounded-full bg-black/60 border border-white/15 text-white text-sm font-bold flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 animate-fade-in">
          <div className="flex flex-col items-center gap-3">
            <span
              key={countdown}
              className="text-9xl font-bold text-white font-[family-name:var(--font-heading)] animate-count-pop"
              style={{ textShadow: '0 0 40px rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.6)' }}
            >
              {countdown}
            </span>
            <span className="text-sm text-zinc-300 font-medium tracking-wide animate-fade-in">
              Get into position…
            </span>
          </div>
        </div>
      )}

      {/* Top banner stack */}
      {isRecording && (
        <div className="absolute top-0 left-0 right-0 z-20 flex flex-col">
          {showNoMovement && (
            <div className="flex items-center gap-2 bg-gradient-to-b from-red-600 to-red-800 px-4 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.4)] animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
              <span className="text-base" aria-hidden="true">⚠️</span>
              <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">No movement detected — start exercising!</span>
            </div>
          )}

          {showTimeWarning && (
            <div className="flex items-center justify-center gap-2 bg-gradient-to-b from-amber-600 to-amber-700 px-4 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.3)] animate-fade-in" style={{ animationDuration: '0.3s' }}>
              <span className="text-base" aria-hidden="true">⏱️</span>
              <span className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {timeRemaining}s remaining — recording stops automatically
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex items-center gap-2 bg-gradient-to-b from-zinc-800/90 to-zinc-900/90 border border-zinc-700/40 px-3 py-1.5 rounded-full shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_2px_6px_rgba(0,0,0,0.4)]">
              <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Rec</span>
              <span className="text-xs font-semibold text-white tabular-nums">{formatTime(elapsed)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default VideoPreview
