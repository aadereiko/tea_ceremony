export type Kind = 'help' | 'shop' | 'room' | 'tea' | 'person' | 'ingredient' | 'catalog' | 'chart' | 'heart' | 'eye' | 'eye-off' | 'download' | 'more' | 'link' | 'plus' | 'trash' | 'leave' | 'check' | 'copy' | 'anonymous'

const PATHS: Record<Kind, string[]> = {
  help: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6', 'M12 17h.01'],
  shop: ['M4 10v10h16V10', 'M3 10l2-6h14l2 6z', 'M10 20v-5h4v5'],
  room: ['M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  tea: ['M4 9h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z', 'M17 10.5h1.5a2.5 2.5 0 0 1 0 5H16.5', 'M8.5 3.5v2.5M12.5 3.5v2.5'],
  person: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  ingredient: ['M5 19c0-8 5-13 15-14-1 10-6 15-14 15', 'M5 19l7-7'],
  catalog: ['M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z', 'M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3', 'M9 7h6'],
  chart: ['M5 20V11', 'M12 20V5', 'M19 20v-6'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  'eye-off': ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M4 4l16 16'],
  link: ['M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1', 'M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1'],
  anonymous: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0', 'M4 4l16 16'],
  copy: ['M9 9h10v11H9z', 'M15 9V5H5v11h4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  trash: ['M4 7h16', 'M9 7V4.5h6V7', 'M6.5 7l1 13h9l1-13', 'M10 11v5.5M14 11v5.5'],
  leave: ['M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4', 'M10 16l-4-4 4-4', 'M6 12h10'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  download: ['M12 4v11', 'M7.5 10.5 12 15l4.5-4.5', 'M5 19h14'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
}

export function KindIcon({ kind, size = 18 }: { kind: Kind; size?: number }) {
  return (
    <svg
      className="kind-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[kind].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

export function Heading({ kind, children, level = 2 }: { kind: Kind; children: React.ReactNode; level?: 2 | 3 }) {
  const Tag = level === 2 ? 'h2' : 'h3'
  return (
    <Tag className="with-icon">
      <KindIcon kind={kind} size={level === 2 ? 20 : 18} />
      {children}
    </Tag>
  )
}
