import { hueStyle } from '../lib/avatar'
import { Illustration } from '../lib/illustrations'

type Props = { name: string; colorFrom: string; size?: number; badge?: boolean; label?: string }

export function ItemIcon({ name, colorFrom, size = 20, badge = false, label }: Props) {
  return (
    <span
      className={badge ? 'avatar' : 'tinted'}
      style={hueStyle(colorFrom)}
      // A native title, not the CSS tooltip: this is used inside scrolling tables that clip it.
      title={label}
      aria-label={label}
    >
      <Illustration name={name} size={size} />
    </span>
  )
}
