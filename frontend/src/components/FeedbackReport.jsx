import WarningBanner from './WarningBanner'

export default function FeedbackReport({ report, onRecordAgain, onUploadAgain }) {
  if (!report) return null

  const isNoMovement = report.warning && report.form_score === 0

  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      {report.warning && <WarningBanner message={report.warning} />}

      {!isNoMovement && (
        <div className="rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/40 p-8 space-y-8 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_6px_20px_rgba(0,0,0,0.4)]">
          {/* Score — scales in */}
          <div className="text-center py-4 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            {report.detected_exercise && (
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 mb-3">
                {report.detected_exercise}
              </div>
            )}
            <div className="text-7xl font-bold text-emerald-400 drop-shadow-[0_2px_4px_rgba(52,211,153,0.2)] font-[family-name:var(--font-heading)]">
              {report.form_score}
            </div>
            <div className="text-sm uppercase tracking-widest text-zinc-500 mt-2">Form Score</div>
          </div>

          {/* Positive Observations — slides in */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
            <h3 className="text-base font-semibold text-emerald-400 border-b border-zinc-700/50 pb-2 mb-4 font-[family-name:var(--font-heading)]">
              What You Did Well
            </h3>
            <ul className="space-y-3">
              {report.positive_observations.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-300 leading-relaxed">
                  <span className="mt-2 h-2 w-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Improvement Suggestions — slides in with more delay */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <h3 className="text-base font-semibold text-amber-400 border-b border-zinc-700/50 pb-2 mb-4 font-[family-name:var(--font-heading)]">
              Areas to Improve
            </h3>
            <ul className="space-y-3">
              {report.improvement_suggestions.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-300 leading-relaxed">
                  <span className="mt-2 h-2 w-2 rounded-full bg-amber-400 shrink-0 shadow-[0_0_4px_rgba(251,191,36,0.4)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4 pt-2 animate-fade-in" style={{ animationDelay: '0.65s' }}>
        <button
          onClick={onRecordAgain}
          className="rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 px-8 py-3.5 text-base font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-blue-400 hover:to-blue-600 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-px"
        >
          Record Again
        </button>
        <label className="rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-3.5 text-base font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_12px_rgba(0,0,0,0.4)] hover:from-emerald-400 hover:to-emerald-600 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-px">
          Upload Again
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            className="hidden"
            onChange={onUploadAgain}
          />
        </label>
      </div>
    </div>
  )
}
