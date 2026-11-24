import { useState } from 'react'

import { SCORE_FIELDS, type RatingInput, type ScoreField } from '../lib/api'

const LABELS: Record<ScoreField, { label: string; hint?: string }> = {
  smell: { label: 'Smell', hint: 'How much you like the aroma. 0 is unpleasant, 10 is lovely.' },
  taste: { label: 'Taste', hint: 'How much you enjoy the flavour while sipping.' },
  finish: { label: 'Finish', hint: 'How pleasant the aftertaste is a few seconds after you swallow.' },
  overall: { label: 'Overall' },
}

const EMPTY: RatingInput = {
  smell: null,
  taste: null,
  finish: null,
  overall: null,
  buy_again: null,
  note: '',
}

type Props = {
  initial: RatingInput | null
  pending: boolean
  error: string | null
  onSubmit: (rating: RatingInput) => void
}

export function RatingForm({ initial, pending, error, onSubmit }: Props) {
  const [draft, setDraft] = useState<RatingInput>(initial ?? EMPTY)
  const hasScore = SCORE_FIELDS.some((f) => draft[f] !== null)
  const toggle = <K extends keyof RatingInput>(key: K, value: RatingInput[K]) =>
    setDraft((d) => ({ ...d, [key]: d[key] === value ? null : value }))

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ ...draft, note: draft.note.trim() })
      }}
    >
      {SCORE_FIELDS.map((field) => (
        <fieldset key={field} className="crit">
          <legend className="label">{LABELS[field].label}</legend>
          {LABELS[field].hint && <small className="muted">{LABELS[field].hint}</small>}
          <div className="dots">
            {Array.from({ length: 11 }, (_, v) => (
              <button
                type="button"
                key={v}
                className={`dot${draft[field] === v ? ' on' : ''}`}
                aria-pressed={draft[field] === v}
                aria-label={`${LABELS[field].label} ${v}`}
                onClick={() => toggle(field, v)}
              >
                {v}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset className="crit">
        <legend className="label">Would buy again</legend>
        <small className="muted">Would you buy a pack of this tea for yourself?</small>
        <div className="segs">
          {[false, true].map((value) => (
            <button
              type="button"
              key={String(value)}
              className={`seg${draft.buy_again === value ? ' on' : ''}`}
              aria-pressed={draft.buy_again === value}
              onClick={() => toggle('buy_again', value)}
            >
              {value ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </fieldset>
      <textarea
        aria-label="Note"
        rows={2}
        maxLength={2000}
        placeholder="Notes: what does it remind you of?"
        value={draft.note}
        onChange={(e) => setDraft({ ...draft, note: e.target.value })}
      />
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="primary" disabled={pending || !hasScore}>
          {pending ? 'Saving…' : initial ? 'Update my rating' : 'Save my rating'}
        </button>
      </div>
    </form>
  )
}
