import { useEffect, useRef, useState } from 'react'

import type { IngredientRef, TeaInput } from '../lib/api'
import { TEA_COLORS, TEA_ICONS, teaColor } from '../lib/icons'
import { IconPicker } from './IconPicker'
import { IngredientCombobox } from './IngredientCombobox'

type Props = {
  initial?: TeaInput
  known: IngredientRef[]
  submitLabel: string
  pending: boolean
  error: string | null
  onSubmit: (tea: TeaInput) => void
}

export function TeaForm({ initial, known, submitLabel, pending, error, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [ingredients, setIngredients] = useState(initial?.ingredients ?? [])
  const [icon, setIcon] = useState(initial?.icon ?? null)
  const [color, setColor] = useState(initial?.color ?? null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  // An error belongs to the values that caused it; hide it once the user changes anything.
  const [edited, setEdited] = useState(false)
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current) setEdited(true)
    mounted.current = true
  }, [name, ingredients, icon, color, notes])

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        setEdited(false)
        onSubmit({ name, ingredients, icon, color, notes })
      }}
    >
      <label className="field" htmlFor="tea-name">
        <span className="label">Name</span>
        <input
          id="tea-name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Angel kiss"
        />
      </label>
      <IconPicker label="Icon" icons={TEA_ICONS} value={icon} onChange={setIcon} />
      <fieldset className="crit">
        <legend className="label">Colour of the brew</legend>
        <div className="swatches">
          {TEA_COLORS.map((c, i) => (
            <button
              type="button"
              key={c.key}
              className={`swatch tip ${i < TEA_COLORS.length / 2 ? 'tip-start' : 'tip-end'}${color === c.key ? ' on' : ''}`}
              style={{ background: c.hex }}
              data-tip={`${c.name}: ${c.teas}`}
              aria-label={`${c.name}, like ${c.teas}`}
              aria-pressed={color === c.key}
              onClick={() => setColor(color === c.key ? null : c.key)}
            />
          ))}
        </div>
        <small className="muted">
          {teaColor(color) ? `${teaColor(color)!.name}, like ${teaColor(color)!.teas}.` : 'Hover a colour to see which teas brew like it.'}
        </small>
      </fieldset>
      <div className="field">
        <label className="label" htmlFor="tea-ingredients">
          Ingredients
        </label>
        <IngredientCombobox
          id="tea-ingredients"
          value={ingredients}
          options={known}
          onChange={setIngredients}
        />
        <small className="muted">Pick from the catalog or type a new one. Leave empty if you don't know.</small>
      </div>
      <label className="field" htmlFor="tea-notes">
        <span className="label">Notes</span>
        <textarea
          id="tea-notes"
          rows={2}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Brew at 80 °C for 4 minutes"
        />
        <small className="muted">Shown even while the tea is a mystery, so keep its name and ingredients out.</small>
      </label>
      {error && !edited && <p className="error">{error}</p>}
      <button className="primary" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
