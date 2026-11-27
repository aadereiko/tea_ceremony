import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  eyebrow?: string
  title: ReactNode
  children: ReactNode
}

export function Sheet({ open, onClose, eyebrow, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.scrollTop = 0
      // showModal() moves focus to the first focusable element (the close button), undoing React's
      // autoFocus; typing a space would then close the sheet.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      // The browser also fires "close" when this component closes the dialog because `open`
      // became false, e.g. while switching to another sheet. Reporting that would undo the switch.
      // React also passes a nested sheet's "close" up to this one (plain DOM would not), so a
      // confirmation inside a sheet would close both; only react to our own dialog closing.
      onClose={(e) => {
        if (e.target === e.currentTarget && openRef.current) onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="sheet-body">
          <div className="sheet-head">
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
