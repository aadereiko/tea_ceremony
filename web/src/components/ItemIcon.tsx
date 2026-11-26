import { hueStyle } from '../lib/avatar'
import { Illustration } from '../lib/illustrations'

type Props = { name: string; colorFrom: string; size?: number; badge?: boolean; label?: string }

export function ItemIcon({ name, colorFrom, size = 20, badge = false, label }: Props) {
  return (
    <span
      className={`${badge ? 'avatar' : 'tinted'}${label ? ' tip' : ''}`}
      style={hueStyle(colorFrom)}
      data-tip={label}
    >
      <Illustration name={name} size={size} />
    </span>
  )
}
