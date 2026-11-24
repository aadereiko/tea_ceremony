import { useState } from 'react'

import type { TeaInput } from '../lib/api'
import { splitIngredients } from '../lib/format'

type Props = {
  initial?: TeaInput
  submitLabel: string
  pending: boolean
  error: string | null
  onSubmit: (tea: TeaInput) => void
}

export function TeaForm({ initial, submitLabel, pending, error, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [ingredients, setIngredients] = useState(initial?.ingredients.join(', ') ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, ingredients: splitIngredients(ingredients), notes })
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
      <label className="field" htmlFor="tea-ingredients">
        <span className="label">Ingredients</span>
        <textarea
          id="tea-ingredients"
          rows={2}
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="white tea, vanilla, bergamot, marigold"
        />
        <small className="muted">Separate with commas. Leave empty if you don't know them.</small>
      </label>
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
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
