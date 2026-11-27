import * as Plot from '@observablehq/plot'
import { useEffect, useRef, useState } from 'react'

import type { Analytics } from '../lib/api'
import { teaColor } from '../lib/icons'

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function PlotBox({ make }: { make: (width: number) => SVGSVGElement | HTMLElement }) {
  const [ref, width] = useWidth()
  useEffect(() => {
    const box = ref.current
    if (!box || width === 0) return
    const chart = make(width)
    box.replaceChildren(chart)
    return () => chart.remove()
  }, [make, width, ref])
  return <div ref={ref} className="plot" />
}

const MUTED = 'var(--muted)'

// Plot draws its own tooltip box; these match the app's tooltip look.
const TIP = { fill: 'var(--tip-bg)', stroke: 'var(--line)', fontSize: 13, lineHeight: 1.35, textPadding: 10, lineWidth: 26 } as const

type Tea = Analytics['ranking'][number]

function scoreWords(score: number) {
  if (score >= 7) return 'a favourite'
  if (score >= 5) return 'liked well enough'
  return 'not much loved'
}

function spreadWords(spread: number) {
  if (spread <= 1) return 'everyone agrees'
  if (spread <= 3) return 'small differences'
  if (spread <= 5) return 'people disagree'
  return 'it splits the room'
}

const teaTip = (d: Tea) =>
  [
    d.name,
    `Fair score ${d.fair_score!.toFixed(1)}: ${scoreWords(d.fair_score!)}`,
    `${d.spread} ${d.spread === 1 ? 'point' : 'points'} between highest and lowest: ${spreadWords(d.spread!)}`,
    `${d.rating_count} ratings, plain average ${d.average_overall?.toFixed(1) ?? '–'}`,
  ].join('\n')

export function TasteMap({ ranking }: { ranking: Analytics['ranking'] }) {
  const teas = ranking.filter((r) => r.fair_score !== null && r.spread !== null)
  const skipped = ranking.length - teas.length

  if (teas.length === 0)
    return <div className="notice small">The map needs teas that at least two people scored.</div>

  const make = (width: number) =>
    Plot.plot({
      width,
      height: Math.min(360, Math.max(260, width * 0.6)),
      marginLeft: 44,
      marginBottom: 40,
      style: { background: 'transparent', fontSize: '12px', overflow: 'visible' },
      x: { domain: [0, 10], label: 'Fair score →', grid: true },
      y: { domain: [0, 10], label: '↑ Points apart', grid: true },
      marks: [
        Plot.text([{ x: 9.8, y: 0.4 }], { x: 'x', y: 'y', text: () => 'Everyone loves it', textAnchor: 'end', fill: MUTED }),
        Plot.text([{ x: 0.2, y: 0.4 }], { x: 'x', y: 'y', text: () => 'Nobody likes it', textAnchor: 'start', fill: MUTED }),
        Plot.text([{ x: 5, y: 9.6 }], { x: 'x', y: 'y', text: () => 'Splits the room', fill: MUTED }),
        Plot.dot(teas, {
          x: 'fair_score',
          y: 'spread',
          r: 8,
          fill: (d: (typeof teas)[number]) => teaColor(d.color)?.hex ?? '#9a9a96',
          stroke: 'var(--card)',
          strokeWidth: 2,
          title: teaTip,
          tip: TIP,
        }),
      ],
    })

  return (
    <>
      <PlotBox make={make} />
      {skipped > 0 && (
        <p className="muted small">
          {skipped} {skipped === 1 ? 'tea has' : 'teas have'} only one score, so {skipped === 1 ? "it isn't" : "they aren't"} on
          the map yet.
        </p>
      )}
    </>
  )
}

const FIELD_LABEL: Record<string, string> = { smell: 'Smell', taste: 'Taste', finish: 'Finish' }

type Bar = { field: string; value: number }

function linkWords(value: number) {
  if (value >= 0.7) return 'Strong link'
  if (value >= 0.4) return 'Some link'
  if (value > -0.4) return 'Little or no link'
  return 'Opposite link'
}

const driverTip = (who: string) => (d: Bar) => {
  const whose = who === 'Everyone' ? "people's" : `${who}'s`
  const meaning =
    d.value >= 0.4
      ? `When ${whose} ${d.field} score is high, Overall tends to be high too.`
      : d.value > -0.4
        ? `${d.field} doesn't say much about ${whose} Overall score.`
        : `A high ${d.field} score tends to come with a lower Overall. With few teas, this is often chance.`
  return `${d.field} and Overall: ${d.value.toFixed(2)}\n${linkWords(d.value)}. ${meaning}`
}

function DriverBars({ who, bars, axis }: { who: string; bars: Bar[]; axis: boolean }) {
  const make = (width: number) =>
    Plot.plot({
      width,
      height: axis ? 110 : 84,
      marginLeft: 56,
      marginRight: 44,
      marginBottom: axis ? 34 : 6,
      style: { background: 'transparent', fontSize: '12px' },
      x: { domain: [-1, 1], label: axis ? 'Moves with Overall →' : null, grid: true, axis: axis ? 'bottom' : null },
      y: { label: null, domain: ['Smell', 'Taste', 'Finish'] },
      marks: [
        Plot.ruleX([0], { stroke: MUTED }),
        Plot.barX(bars, {
          x: 'value',
          y: 'field',
          fill: (d: Bar) => (d.value >= 0 ? 'var(--pos)' : 'var(--neg)'),
          title: driverTip(who),
          tip: TIP,
        }),
        ...[true, false].map((positive) =>
          Plot.text(
            bars.filter((b) => b.value >= 0 === positive),
            {
              x: 'value',
              y: 'field',
              text: (d: Bar) => d.value.toFixed(2),
              textAnchor: positive ? 'start' : 'end',
              dx: positive ? 6 : -6,
              fill: 'currentColor',
            },
          ),
        ),
      ],
    })
  return <PlotBox make={make} />
}

export function Drivers({ drivers, minTeas }: { drivers: Analytics['drivers']; minTeas: number }) {
  const people = drivers
    .map((d) => ({
      name: d.participant?.display_name ?? 'Everyone',
      teas: d.teas,
      bars: Object.entries(d.correlation).flatMap(([field, value]) =>
        value === null ? [] : [{ field: FIELD_LABEL[field], value }],
      ),
    }))
    .filter((p) => p.bars.length > 0)

  if (people.length === 0)
    return <div className="notice small">This needs at least {minTeas} teas with Overall and the other scores.</div>

  return (
    <div className="stack-sm">
      {people.map((p, i) => (
        <div key={p.name}>
          <span className="label">
            {p.name} · {p.teas} {p.teas === 1 ? 'rating' : 'ratings'}
          </span>
          <DriverBars who={p.name} bars={p.bars} axis={i === people.length - 1} />
        </div>
      ))}
    </div>
  )
}
