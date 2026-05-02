import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      {/* Hero */}
      <div className="max-w-2xl space-y-6">
        <span className="text-7xl">🏋️‍♂️</span>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          AI-Powered
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
            Gym Form Checker
          </span>
        </h1>

        <p className="mx-auto max-w-md text-base text-zinc-400 leading-relaxed">
          Record yourself exercising and get instant feedback on your form.
          Our AI analyzes your joint angles, posture, and movement to help
          you train safer and more effectively.
        </p>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Link
            to="/check"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all hover:shadow-emerald-500/30 hover:-translate-y-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
            </svg>
            Start Checking Your Form
          </Link>
          <span className="text-xs text-zinc-500">No sign-up required • Works in your browser</span>
        </div>
      </div>

      {/* Features */}
      <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureCard
          icon="📹"
          title="Record"
          description="Open your camera and record your exercise with a 10-second countdown."
        />
        <FeatureCard
          icon="🤖"
          title="Analyze"
          description="AI detects 33 body landmarks and scores your joint angles frame by frame."
        />
        <FeatureCard
          icon="📊"
          title="Improve"
          description="Get a detailed score with specific feedback on what to fix."
        />
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-left">
      <span className="text-2xl">{icon}</span>
      <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{description}</p>
    </div>
  )
}
