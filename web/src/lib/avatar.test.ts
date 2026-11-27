import { hueFor } from './avatar'

test('the same name always gets the same colour, ignoring case and spacing', () => {
  expect(hueFor('Anna')).toBe(hueFor('  anna '))
  expect(hueFor('Mary Jane')).toBe(hueFor('mary   jane'))
})

test('different names spread over the palette', () => {
  const hues = new Set(Array.from({ length: 50 }, (_, i) => hueFor(`Taster ${i}`)))
  expect(hues.size).toBeGreaterThan(6)
})
