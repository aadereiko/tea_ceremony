type Props = {
  id: string
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function Toggle({ id, label, hint, checked, disabled, onChange }: Props) {
  return (
    <label className="toggle" htmlFor={id}>
      <span className="toggle-text">
        <span className="label">{label}</span>
        <small className="muted">{hint}</small>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}
