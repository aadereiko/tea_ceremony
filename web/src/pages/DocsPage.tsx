import { marked } from 'marked'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'

import { KindIcon, type Kind } from '../components/KindIcon'

const SOURCES = import.meta.glob<string>('../docs/*.md', { query: '?raw', import: 'default', eager: true })

type Page = { slug: string; title: string; icon: Kind; group: string }

const PAGES: Page[] = [
  { slug: 'start', title: 'Getting started', icon: 'check', group: 'Start here' },
  { slug: 'rooms', title: 'Rooms and people', icon: 'room', group: 'Tasting together' },
  { slug: 'settings', title: 'Room settings', icon: 'eye', group: 'Tasting together' },
  { slug: 'rating', title: 'Rating and revealing', icon: 'heart', group: 'Tasting together' },
  { slug: 'analytics', title: 'Analytics', icon: 'chart', group: 'Tasting together' },
  { slug: 'teas', title: 'Teas and the catalog', icon: 'catalog', group: 'Catalog' },
  { slug: 'ingredients', title: 'Ingredients', icon: 'ingredient', group: 'Catalog' },
  { slug: 'shops', title: 'Tea shops', icon: 'shop', group: 'Shops' },
  { slug: 'help', title: 'Privacy and help', icon: 'help', group: 'Help' },
]

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

marked.use({
  renderer: {
    heading({ tokens, depth, text }) {
      return `<h${depth} id="${slugify(text)}">${this.parser.parseInline(tokens)}</h${depth}>`
    },
  },
})

const source = (slug: string) => SOURCES[`../docs/${slug}.md`] ?? ''
const sections = (slug: string) => [...source(slug).matchAll(/^## (.+)$/gm)].map((m) => m[1])

export function DocsPage() {
  const { page = '' } = useParams()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const index = PAGES.findIndex((p) => p.slug === page)
  const current = PAGES[index]
  // The docs files ship with the app, so rendering their HTML directly is safe.
  const html = useMemo(() => (current ? (marked.parse(source(current.slug), { async: false }) as string) : ''), [current])

  useEffect(() => {
    if (!current) return
    document.title = `${current.title} · Tea Ceremony docs`
    setMenuOpen(false)
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [current, hash])

  if (!current) return <Navigate to="/docs/start" replace />

  const query = search.trim().toLowerCase()
  const shown = PAGES.filter((p) => !query || p.title.toLowerCase().includes(query) || source(p.slug).toLowerCase().includes(query))
  const groups = [...new Set(shown.map((p) => p.group))]
  const prev = PAGES[index - 1]
  const next = PAGES[index + 1]

  // Links inside the Markdown are plain <a> tags; sending in-app ones through the router avoids
  // reloading the whole app on every click.
  const followLink = (e: MouseEvent) => {
    const link = (e.target as HTMLElement).closest('a')
    const href = link?.getAttribute('href')
    if (href?.startsWith('/') && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      navigate(href)
    }
  }

  return (
    <main className="docs-layout">
      <aside className="docs-nav">
        <button className="ghost docs-menu-toggle" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <KindIcon kind={current.icon} size={16} />
          {current.title}
          <span className="muted">{menuOpen ? '▴' : '▾'}</span>
        </button>
        <div className={`docs-menu${menuOpen ? ' open' : ''}`}>
          <input type="search" placeholder="Search the docs" aria-label="Search the docs" value={search} onChange={(e) => setSearch(e.target.value)} />
          {groups.length === 0 && <p className="muted small">Nothing matches “{search.trim()}”.</p>}
          {groups.map((group) => (
            <nav key={group} aria-label={group}>
              <span className="label">{group}</span>
              {shown
                .filter((p) => p.group === group)
                .map((p) => (
                  <Link key={p.slug} to={`/docs/${p.slug}`} className={`docs-link${p.slug === current.slug ? ' on' : ''}`} aria-current={p.slug === current.slug ? 'page' : undefined}>
                    <KindIcon kind={p.icon} size={16} />
                    {p.title}
                  </Link>
                ))}
            </nav>
          ))}
        </div>
      </aside>

      <div className="docs-main">
        {sections(current.slug).length > 2 && (
          <nav className="docs-toc" aria-label="On this page">
            <span className="label">On this page</span>
            {sections(current.slug).map((title) => (
              <Link key={title} to={`#${slugify(title)}`}>
                {title}
              </Link>
            ))}
          </nav>
        )}
        <article className="panel docs" onClick={followLink} dangerouslySetInnerHTML={{ __html: html }} />
        <nav className="docs-pager" aria-label="More pages">
          {prev ? (
            <Link to={`/docs/${prev.slug}`} className="docs-step">
              <span className="muted small">‹ Previous</span>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/docs/${next.slug}`} className="docs-step next">
              <span className="muted small">Next ›</span>
              {next.title}
            </Link>
          )}
        </nav>
        <p className="app-version muted small">Tea Ceremony v{__APP_VERSION__}</p>
      </div>
    </main>
  )
}
