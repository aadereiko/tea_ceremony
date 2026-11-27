import { Link, NavLink } from 'react-router'

import { KindIcon, type Kind } from './KindIcon'
import { Leaf } from './Leaf'

const LINKS: { to: string; label: string; icon: Kind }[] = [
  { to: '/catalog', label: 'Catalog', icon: 'catalog' },
  { to: '/shops', label: 'Shops', icon: 'shop' },
  { to: '/docs', label: 'Docs', icon: 'help' },
]

export function AppHeader() {
  return (
    <header className="app-bar">
      <Link to="/" className="app-bar-brand">
        <Leaf size={18} />
        Tea Ceremony
      </Link>
      <nav className="app-bar-links" aria-label="Main">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} className="app-bar-link">
            <KindIcon kind={l.icon} size={16} />
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
