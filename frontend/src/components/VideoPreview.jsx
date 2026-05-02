import { forwardRef } from 'react'

const VideoPreview = forwardRef(function VideoPreview(
  { countdown, isRecording, elapsed, showNoMovement },
  ref
) {
  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0')
    const s = String(sec % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="relative w-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-zinc-800">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
        aria-label="Live camera feed"
      />

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="flex flex-col items-center gap-2">
            <span className="text-8xl font-bold text-white drop-shadow-lg animate-pulse">
              {countdown}
            </span>
            <span className="text-sm text-zinc-300 font-medium">Get into position…</span>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full z-10">
          <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Rec</span>
          <span className="text-xs font-semibold text-white tabular-nums">{formatTime(elapsed)}</span>
        </div>
      )}

      {/* No-movement warning */}
      {showNoMovement && isRecording && (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-2 bg-red-700/95 px-4 py-2.5 z-20">
          <span className="text-lg" aria-hidden="true">⚠️</span>
          <span className="text-sm font-bold text-white">No movement detected — start exercising!</span>
        </div>
      )}
    </div>
  )
})

export default VideoPreview
