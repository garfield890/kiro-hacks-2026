import { Link } from 'react-router-dom'
import heroBg from '../assets/gym-opt.jpg'
import recordImg from '../assets/record.jpg'
import analyzeImg from '../assets/analyze.jpg'
import improveImg from '../assets/improve.jpg'

export default function HomePage() {
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(0,0,0,0.7) 0%, transparent 100%)'
        }} />

        <div className="relative max-w-2xl space-y-8">
          {/* Emoji — fades in and scales up */}
          <span className="text-8xl block drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] animate-scale-in">🏋️‍♂️</span>

          {/* Title — fades in up with slight delay */}
          <h1 className="drop-shadow-[0_3px_12px_rgba(0,0,0,0.7)] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <span className="block text-4xl sm:text-6xl font-extralight tracking-[0.2em] text-white uppercase font-[family-name:var(--font-display)]">
              AI-Powered
            </span>
            <span className="block text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-transparent mt-1 font-[family-name:var(--font-heading)]">
              Gym Form Checker
            </span>
          </h1>

          {/* Description — fades in up, more delay */}
          <p className="mx-auto max-w-lg text-base sm:text-lg font-normal text-white/90 leading-relaxed tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Record yourself exercising and get instant feedback on your form.
            Our AI analyzes your joint angles, posture, and movement to help
            you train safer and more effectively.
          </p>

          {/* CTA — fades in up, most delay */}
          <div className="flex flex-col items-center gap-4 pt-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              to="/check"
              className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-10 py-4 text-lg font-bold uppercase tracking-wider text-white no-underline shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_4px_16px_rgba(0,0,0,0.5),0_2px_4px_rgba(0,0,0,0.4)] hover:from-emerald-400 hover:to-emerald-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_8px_24px_rgba(0,0,0,0.5)] active:translate-y-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
              </svg>
              Start Now
            </Link>
            <span className="text-sm font-normal text-white/60 tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              No sign-up required · Record live or upload a video
            </span>
          </div>
        </div>
      </div>

      {/* Feature cards — staggered slide-in from bottom */}
      <div className="relative z-10 px-6 pb-20">
        <p className="text-center text-xs font-medium uppercase tracking-[0.25em] text-white/50 mb-8 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] animate-fade-in" style={{ animationDelay: '0.4s' }}>
          How it works
        </p>
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          <FeatureCard image={recordImg} step="01" title="Record" delay="0.45s"
            description="Open your camera and record your exercise with a 10-second countdown to get into position." />
          <FeatureCard image={analyzeImg} step="02" title="Analyze" delay="0.55s"
            description="AI detects 33 body landmarks and scores your joint angles across every frame." />
          <FeatureCard image={improveImg} step="03" title="Improve" delay="0.65s"
            description="Get a detailed score with specific, constructive feedback on what to improve." />
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ image, step, title, description, delay }) {
  return (
    <div
      className="group rounded-2xl overflow-hidden bg-black/80 border border-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_12px_32px_rgba(0,0,0,0.6)] animate-slide-in-bottom"
      style={{ animationDelay: delay }}
    >
      <div className="relative h-40 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90" />
      </div>
      <div className="p-6 pt-4">
        <span className="text-2xl font-extralight text-zinc-500 tracking-wider">{step}</span>
        <h3 className="text-lg font-bold text-white tracking-tight mt-1 font-[family-name:var(--font-heading)]">{title}</h3>
        <p className="mt-2 text-sm font-normal text-zinc-300 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
