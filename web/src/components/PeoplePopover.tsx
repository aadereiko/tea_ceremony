import { useEffect, useId, useRef, useState } from 'react'

import type { Participant } from '../lib/api'
import { ItemIcon } from './ItemIcon'

type Props = {
  people: Participant[]
  meId: string
  onChangeAnimal: () => void
}

export function PeoplePopover({ people, meId, onChangeAnimal }: Props) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="people-wrap" ref={wrapper}>
      <button
        ref={button}
        className="people-stack"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${people.length} ${people.length === 1 ? 'person' : 'people'} in this room`}
      >
        <span className="people-count">{people.length}</span>
        <span className="stack-icons" aria-hidden="true">
          {people.slice(0, 3).map((p) => (
            <ItemIcon key={p.id} name={p.icon} colorFrom={p.display_name} badge />
          ))}
        </span>
      </button>
      {open && (
        <div className="popover" id={panelId} role="dialog" aria-label="People in this room">
          <ul className="people-list">
            {people.map((p) => (
              <li key={p.id}>
                <ItemIcon name={p.icon} colorFrom={p.display_name} badge />
                <span className="tea-main">
                  <span className="tea-name">
                    {p.display_name}
                    {p.id === meId && <span className="muted"> (you)</span>}
                  </span>
                </span>
                {p.is_owner && <span className="badge">host</span>}
                {p.id === meId && (
                  <button
                    className="ghost small"
                    onClick={() => {
                      setOpen(false)
                      onChangeAnimal()
                    }}
                  >
                    Change animal
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
