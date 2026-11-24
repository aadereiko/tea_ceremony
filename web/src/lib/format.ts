export const fmt = (n: number | null | undefined) => (n == null ? '–' : n.toFixed(1))

export const signed = (n: number | null | undefined) => {
  if (n == null) return '–'
  const rounded = Math.round(n * 10) / 10
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded).toFixed(1)}`
}

export function splitIngredients(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}
