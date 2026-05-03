import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  const linkClass = (path) => {
    const isActive = location.pathname === path
    return [
      'text-sm font-medium transition-all rounded-lg px-3 py-1.5',
      isActive
        ? 'text-white underline underline-offset-4 decoration-emerald-400 decoration-2'
        : 'text-zinc-300 no-underline hover:text-white hover:bg-white/10',
    ].join(' ')
  }

  const handleCheckFormClick = (e) => {
    e.preventDefault()
    // Always navigate fresh — forces remount via location.key
    navigate('/check', { replace: location.pathname === '/check' })
  }

  return (
    <nav className={`w-full border-b transition-colors ${
      isHome
        ? 'bg-black/60 border-white/10'
        : 'bg-zinc-900 border-zinc-950 shadow-[0_1px_0_0_rgba(255,255,255,0.04)]'
    }`}>
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <span className="text-2xl">🏋️</span>
          <span className="text-base font-bold text-white tracking-tight font-[family-name:var(--font-heading)]">
            GymBro
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/" className={linkClass('/')}>Home</Link>
          <a href="/check" onClick={handleCheckFormClick} className={linkClass('/check')}>Check Form</a>
        </div>
      </div>
    </nav>
  )
}
