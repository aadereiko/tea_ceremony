import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = { title?: string; text: string; children: ReactNode; className?: string }

type Place = { left: number; top: number; arrow: number; below: boolean }

const GAP = 8
const EDGE = 12

export function Explain({ title, text, children, className = '' }: Props) {
  const anchor = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<Place | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor.current || !bubble.current) return
    const a = anchor.current.getBoundingClientRect()
    const b = bubble.current.getBoundingClientRect()
    const below = a.top - b.height - GAP < EDGE
    const centre = a.left + a.width / 2
    const left = Math.min(Math.max(centre - b.width / 2, EDGE), window.innerWidth - b.width - EDGE)
    setPlace({ left, top: below ? a.bottom + GAP : a.top - b.height - GAP, arrow: centre - left, below })
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  // An open <dialog> sits in the browser's "top layer", above everything in <body>, so a tooltip
  // for something inside a sheet must be rendered inside that same dialog to be visible.
  const host = anchor.current?.closest('dialog') ?? document.body

  return (
    <>
      <span
        ref={anchor}
        className={`explain ${className}`}
        tabIndex={0}
        aria-label={`${title ? `${title}: ` : ''}${text}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          setOpen(false)
          setPlace(null)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          setPlace(null)
        }}
        onClick={(e) => {
          // On phones a tap opens it (tapping elsewhere blurs and closes it), and must not also open the
          // row or link it sits in. Toggling here would close it again: a tap fires mouseenter first.
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={bubble}
            role="tooltip"
            className={`bubble${place?.below ? ' below' : ''}`}
            style={place ? { left: place.left, top: place.top, ['--arrow' as string]: `${place.arrow}px` } : { visibility: 'hidden' }}
          >
            {title && <b>{title}</b>}
            <span>{text}</span>
          </div>,
          host,
        )}
    </>
  )
}
