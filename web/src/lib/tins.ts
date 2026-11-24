import type { CSSProperties } from 'react'


const TINS = ['#d6b0b6', '#a6c4bd', '#dcc88e', '#bcb1cf', '#d9b098', '#a7bed1', '#c0cca0', '#d29f9a']

const INK = 'stroke="%23161616" stroke-opacity=".16" fill="none" stroke-width="1.2"'
const PATTERNS: [number, string][] = [
  [16, '<circle cx="8" cy="8" r="1.6" fill="%23161616" fill-opacity=".16"/>'],
  [12, `<path d="M-3 3L3 -3M0 12L12 0M9 15L15 9" ${INK}/>`],
  [20, `<path d="M0 14L5 6L10 14L15 6L20 14" ${INK}/>`],
  [24, `<path d="M0 12Q6 4 12 12T24 12" ${INK}/>`],
  [28, `<path d="M7 21C7 12 13 7 21 7C21 16 16 21 7 21ZM7 21L16 12" ${INK}/>`],
  [26, `<path d="M13 7V19M7 13H19M9 9L17 17M17 9L9 17" ${INK}/>`],
  [24, `<path d="M0 24A12 12 0 0 1 24 24M5 24A7 7 0 0 1 19 24M10 24A2 2 0 0 1 14 24" ${INK}/>`],
  [14, `<path d="M0 .6H14M.6 0V14" ${INK}/>`],
]

// Shift the pattern every 8 teas so a colour never comes back with the same pattern.
export function tinStyle(index: number): CSSProperties {
  const [size, shape] = PATTERNS[(index + Math.floor(index / 8) * 3) % PATTERNS.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${shape}</svg>`
  return {
    backgroundColor: TINS[index % TINS.length],
    backgroundImage: `url('data:image/svg+xml,${svg}')`,
  }
}
