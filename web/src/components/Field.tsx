import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; hint?: string }

export function Field({ label, id, hint, ...input }: Props) {
  return (
    <label className="field" htmlFor={id}>
      <span className="label">{label}</span>
      <input id={id} {...input} />
      {hint && <small className="muted">{hint}</small>}
    </label>
  )
}
