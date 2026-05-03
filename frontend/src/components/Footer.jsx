import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-zinc-950">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">

          {/* Brand + about */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <Logo size={24} />
              <span className="text-sm font-bold text-white tracking-tight font-[family-name:var(--font-heading)]">
                FormCheck
              </span>
            </div>
            <p className="text-xs font-light text-zinc-500 leading-relaxed max-w-xs">
              Open-source AI form analysis powered by MediaPipe BlazePose.
              Built for lifters who want honest feedback without a personal trainer.
            </p>
          </div>

          {/* How the scoring works */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 font-[family-name:var(--font-heading)]">
              Scoring System
            </h4>
            <ul className="space-y-2 text-xs text-zinc-500 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span><span className="text-emerald-400 font-medium">90–100</span> — Excellent form, keep it up</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <span><span className="text-blue-400 font-medium">70–89</span> — Good form, a few things to refine</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span><span className="text-amber-400 font-medium">40–69</span> — Room for improvement, check the feedback</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                <span><span className="text-red-400 font-medium">0–39</span> — Needs attention, focus on the basics</span>
              </li>
            </ul>
          </div>

          {/* Tech + tips */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 font-[family-name:var(--font-heading)]">
              Tips for Best Results
            </h4>
            <ul className="space-y-2 text-xs text-zinc-500 leading-relaxed">
              <li>📐 Stand 6–8 feet from the camera</li>
              <li>💡 Use good lighting — avoid backlit windows</li>
              <li>👤 Keep your full body in frame</li>
              <li>📱 Prop your phone at chest height, landscape</li>
              <li>🔁 Record 3–5 reps for the most accurate score</li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-600">
            © {new Date().getFullYear()} FormCheck · Built with FastAPI, MediaPipe & React
          </p>
          <div className="flex items-center gap-4">
            <Link to="/check" className="text-[11px] text-zinc-500 hover:text-white transition-colors no-underline">
              Check Form
            </Link>
            <span className="text-zinc-800">·</span>
            <a
              href="https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-500 hover:text-white transition-colors underline underline-offset-2 decoration-zinc-700"
            >
              MediaPipe Docs
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
