// v1.6.1 — Footer global con links legales. Montado en main.tsx para
// aparecer en todas las páginas (login + autenticadas).

import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer
      data-testid="global-footer"
      className="text-center text-xs text-white/40 py-4 space-x-3"
    >
      <Link to="/privacy" className="hover:text-white/70">Privacidad</Link>
      <span>·</span>
      <Link to="/terms" className="hover:text-white/70">Términos</Link>
      <span>·</span>
      <Link to="/cookies" className="hover:text-white/70">Cookies</Link>
    </footer>
  )
}
