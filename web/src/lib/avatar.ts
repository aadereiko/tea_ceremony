import type { CSSProperties } from 'react'

import { teaColor } from './icons'

const HUES = [145, 200, 30, 270, 5, 175, 330, 50, 230, 95]

export function hueFor(name: string): number {
  const seed = name.trim().toLowerCase().replace(/\s+/g, ' ')
  // FNV-1a: tiny and well spread, so similar names (Anna, Anne) still land on
  // different colours. Math.imul keeps the multiplication in 32-bit integers like the reference.
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return HUES[(hash >>> 0) % HUES.length]
}

export function hueStyle(name: string): CSSProperties {
  return { '--hue': hueFor(name) } as CSSProperties
}

export function teaStyle(color: string | null, name: string): CSSProperties {
  const brew = teaColor(color)
  if (!brew) return hueStyle(name)
  return { background: brew.hex, color: brew.dark ? '#fbf3e6' : '#33261a' }
}
