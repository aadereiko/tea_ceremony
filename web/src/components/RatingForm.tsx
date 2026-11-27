import { useEffect, useRef, useState } from 'react'

import { type RatingInput, type ScoreField } from '../lib/api'

const QUESTIONS: { field: ScoreField; label: string }[] = [
  { field: 'smell', label: 'Smell' },
  { field: 'taste', label: 'Taste' },
  { field: 'finish', label: 'Finish (aftertaste)' },
  { field: 'overall', label: 'Overall' },
]

const EMPTY: RatingInput = {
  smell: null,
  taste: null,
  finish: null,
  overall: null,
  buy_again: null,
  note: '',
}

const SAVE_DELAY_MS = 400

type Props = {
  initial: RatingInput | null
  saving: boolean
  error: string | null
  onSave: (rating: RatingInput) => void
}

function cleaned(draft: RatingInput): RatingInput {
  return { ...draft, note: draft.note.trim() }
}

function isEmpty(rating: RatingInput): boolean {
  return Object.values(rating).every((v) => v === null || v === '')
}

export function Scale({ label, value, onPick }: { label: string; value: number | null; onPick: (v: number) => void }) {
  return (
    <div className="dots" role="group" aria-label={label}>
      {Array.from({ length: 11 }, (_, v) => (
        <button
          type="button"
          key={v}
          className={`dot${value === v ? ' on' : ''}`}
          aria-pressed={value === v}
          aria-label={`${label} ${v}`}
          onClick={() => onPick(v)}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

export function RatingForm({ initial, saving, error, onSave }: Props) {
  const [draft, setDraft] = useState<RatingInput>(initial ?? EMPTY)
  const [savedOnce, setSavedOnce] = useState(false)
  const lastSaved = useRef(JSON.stringify(cleaned(initial ?? EMPTY)))
  const pending = useRef<RatingInput | null>(null)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const flush = () => {
    if (!pending.current) return
    const rating = pending.current
    pending.current = null
    lastSaved.current = JSON.stringify(rating)
    onSaveRef.current(rating)
    setSavedOnce(true)
  }

  useEffect(() => {
    const rating = cleaned(draft)
    if (JSON.stringify(rating) === lastSaved.current || isEmpty(rating)) return
    pending.current = rating
    const timer = setTimeout(flush, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft])

  // Closing the sheet unmounts this form; save a change that was still waiting for its timer.
  useEffect(() => flush, [])

  const toggle = <K extends keyof RatingInput>(key: K, value: RatingInput[K]) =>
    setDraft((d) => ({ ...d, [key]: d[key] === value ? null : value }))

  return (
    <div className="stack rating-form">
      <div className="row-between">
        <span className="label">Your rating</span>
        <span className="muted small" aria-live="polite">
          {saving ? 'Saving…' : error ? '' : savedOnce ? 'Saved' : ''}
        </span>
      </div>

      {QUESTIONS.map(({ field, label }) => (
        <div className="crit" key={field}>
          <span className="label">{label}</span>
          <Scale label={label} value={draft[field]} onPick={(v) => toggle(field, v)} />
        </div>
      ))}

      <div className="crit">
        <span className="label">Would you buy it again?</span>
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
      </div>

      <textarea
        aria-label="Your note"
        rows={2}
        maxLength={2000}
        placeholder="A note: what does it remind you of?"
        value={draft.note}
        onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        onBlur={flush}
      />

      {error && <p className="error">{error}</p>}
    </div>
  )
}
