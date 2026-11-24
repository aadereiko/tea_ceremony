import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  eyebrow?: string
  title: ReactNode
  headStyle?: CSSProperties
  children: ReactNode
}

export function Sheet({ open, onClose, eyebrow, title, headStyle, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="sheet-body">
          <div className="sheet-head" style={headStyle}>
            <div>
              {eyebrow && <span className="label">{eyebrow}</span>}
              <h2>{title}</h2>
            </div>
            <button className="close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
