import { teaStyle } from '../lib/avatar'
import { teaColor } from '../lib/icons'
import { Illustration } from '../lib/illustrations'

type Props = { tea: { name: string; icon: string; color: string | null }; size?: number }

export function TeaBadge({ tea, size = 24 }: Props) {
  const brew = teaColor(tea.color)
  return (
    <span
      className={`avatar${brew ? ' tip' : ''}`}
      style={teaStyle(tea.color, tea.name)}
      data-tip={brew ? `${brew.name} brew` : undefined}
      aria-label={brew ? `${brew.name} brew` : undefined}
      role={brew ? 'img' : undefined}
    >
      <Illustration name={tea.icon} size={size} />
    </span>
  )
}
