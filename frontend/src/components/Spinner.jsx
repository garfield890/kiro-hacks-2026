export default function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 w-full animate-fade-in">
      {/* Outer ring with glow */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-zinc-700 border-t-blue-400 animate-spin" />
        <div className="absolute inset-0 rounded-full animate-glow-pulse" />
      </div>

      {/* Shimmer text */}
      <div className="text-center space-y-2">
        <p className="text-base font-medium text-white font-[family-name:var(--font-heading)]">
          Analyzing your form
        </p>
        <p
          className="text-sm font-light tracking-wide"
          style={{
            background: 'linear-gradient(90deg, #71717a 0%, #a1a1aa 50%, #71717a 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'shimmer 2s linear infinite',
          }}
        >
          Detecting landmarks across every frame…
        </p>
      </div>
    </div>
  )
}
