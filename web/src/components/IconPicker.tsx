import { Illustration } from '../lib/illustrations'

type Props = {
  label: string
  icons: string[]
  value: string | null
  onChange: (icon: string | null) => void
}

export function IconPicker({ label, icons, value, onChange }: Props) {
  return (
    <fieldset className="crit">
      <legend className="label">{label}</legend>
      <div className="icon-grid">
        {icons.map((icon) => (
          <button
            type="button"
            key={icon}
            className={`icon-choice tip${value === icon ? ' on' : ''}`}
            data-tip={icon}
            aria-label={icon}
            aria-pressed={value === icon}
            onClick={() => onChange(value === icon ? null : icon)}
          >
            <Illustration name={icon} size={26} />
          </button>
        ))}
      </div>
    </fieldset>
  )
}
