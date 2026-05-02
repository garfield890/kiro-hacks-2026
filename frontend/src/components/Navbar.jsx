import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()

  const linkClass = (path) =>
    `text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'text-white'
        : 'text-zinc-400 hover:text-white'
    }`

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏋️</span>
          <span className="text-base font-bold text-white tracking-tight">
            FormCheck
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className={linkClass('/')}>
            Home
          </Link>
          <Link to="/check" className={linkClass('/check')}>
            Check Form
          </Link>
        </div>
      </div>
    </nav>
  )
}
