export default function WarningBanner({ message }) {
  if (!message) return null

  return (
    <div
      role="alert"
      className="flex items-center gap-4 rounded-2xl bg-gradient-to-b from-red-600 to-red-800 border border-red-500/30 px-6 py-5 text-white font-semibold text-base shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_4px_12px_rgba(0,0,0,0.4)] animate-fade-in-up"
    >
      <span className="text-2xl shrink-0" aria-hidden="true">⚠️</span>
      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] leading-relaxed">{message}</span>
    </div>
  )
}
