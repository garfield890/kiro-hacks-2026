export default function WarningBanner({ message }) {
  if (!message) return null

  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-lg bg-red-700 px-4 py-3 text-white font-semibold text-sm"
    >
      <span className="text-xl shrink-0" aria-hidden="true">⚠️</span>
      <span>{message}</span>
    </div>
  )
}
