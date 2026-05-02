import WarningBanner from './WarningBanner'

export default function FeedbackReport({ report, onRecordAgain }) {
  if (!report) return null

  const isNoMovement = report.warning && report.form_score === 0

  return (
    <div className="w-full space-y-4">
      {report.warning && <WarningBanner message={report.warning} />}

      {!isNoMovement && (
        <div className="rounded-xl bg-zinc-900 p-5 space-y-5">
          {/* Score */}
          <div className="text-center">
            <div className="text-6xl font-bold text-emerald-400">{report.form_score}</div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 mt-1">Form Score</div>
          </div>

          {/* Positive Observations */}
          <div>
            <h3 className="text-sm font-semibold text-emerald-400 border-b border-zinc-800 pb-1 mb-2">
              What You Did Well
            </h3>
            <ul className="space-y-1.5">
              {report.positive_observations.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Improvement Suggestions */}
          <div>
            <h3 className="text-sm font-semibold text-amber-400 border-b border-zinc-800 pb-1 mb-2">
              Areas to Improve
            </h3>
            <ul className="space-y-1.5">
              {report.improvement_suggestions.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={onRecordAgain}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Record Again
        </button>
      </div>
    </div>
  )
}
