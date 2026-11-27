import { useId, useState, type KeyboardEvent } from 'react'

import type { IngredientRef } from '../lib/api'
import { splitIngredients } from '../lib/format'

type Props = {
  id: string
  value: string[]
  options: IngredientRef[]
  onChange: (names: string[]) => void
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function IngredientCombobox({ id, value, options, onChange }: Props) {
  const listId = useId()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const query = text.trim().toLowerCase()
  const matches = options
    .filter((o) => !value.some((v) => same(v, o.name)))
    .filter((o) => !query || o.name.toLowerCase().includes(query))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(query)) - Number(!b.name.toLowerCase().startsWith(query)))
    .slice(0, 8)
  const exact = options.some((o) => same(o.name, text)) || value.some((v) => same(v, text))
  const choices = [
    ...matches.map((o) => ({ key: o.id, name: o.name, isNew: false })),
    ...(query && !exact ? [{ key: 'new', name: text.trim(), isNew: true }] : []),
  ]

  const add = (names: string[]) => {
    const next = [...value]
    for (const name of names) if (!next.some((v) => same(v, name))) next.push(name)
    onChange(next)
    setText('')
    setActive(0)
  }
  const remove = (name: string) => onChange(value.filter((v) => v !== name))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (choices.length) setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length)
    } else if (e.key === 'Enter' || e.key === ',') {
      // Enter must not submit the whole tea form while you're still picking ingredients.
      if (e.key === ',' || query) e.preventDefault()
      if (open && choices[active]) add([choices[active].name])
      else if (query) add([text.trim()])
    } else if (e.key === 'Escape' && open) {
      // preventDefault stops the surrounding <dialog> from treating Escape as "close the sheet".
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'Backspace' && !text && value.length) {
      remove(value[value.length - 1])
    }
  }

  return (
    <div className="combo">
      <div className="combo-box">
        {value.map((name) => (
          <span key={name} className="chip">
            {name}
            <button type="button" className="chip-x" aria-label={`Remove ${name}`} onClick={() => remove(name)}>
              ✕
            </button>
          </span>
        ))}
        <input
          id={id}
          role="combobox"
          aria-expanded={open && choices.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && choices[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={text}
          placeholder={value.length ? 'Add another…' : 'Start typing: vanilla, rose…'}
          onChange={(e) => {
            const typed = e.target.value
            if (/[,;\n]/.test(typed)) add(splitIngredients(typed))
            else setText(typed)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false)
            if (query) add([text.trim()])
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && choices.length > 0 && (
        <ul className="combo-list" id={listId} role="listbox">
          {choices.map((c, i) => (
            <li
              key={c.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              // mousedown, not click: click fires after the input's blur has already closed the list.
              onMouseDown={(e) => {
                e.preventDefault()
                add([c.name])
              }}
              onMouseEnter={() => setActive(i)}
            >
              {c.isNew && <span className="combo-icon">+</span>}
              {c.isNew ? (
                <span>
                  Add new “<b>{c.name}</b>”
                </span>
              ) : (
                <span>{c.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
