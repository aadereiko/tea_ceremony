import { forgetRoom, saveRoom, savedRooms, tokenFor } from './sessions'

beforeEach(() => localStorage.clear())

test('saving a room twice keeps one entry, newest first', () => {
  saveRoom({ slug: 'a', name: 'A', token: 't1', me: 'Sashka' })
  saveRoom({ slug: 'b', name: 'B', token: 't2', me: 'Sashka' })
  saveRoom({ slug: 'a', name: 'A', token: 't3', me: 'Sashka' })
  expect(savedRooms().map((r) => r.slug)).toEqual(['a', 'b'])
  expect(tokenFor('a')).toBe('t3')
})

test('forgetting a room drops its token', () => {
  saveRoom({ slug: 'a', name: 'A', token: 't1', me: 'Sashka' })
  forgetRoom('a')
  expect(tokenFor('a')).toBeNull()
})

test('corrupt storage reads as empty', () => {
  localStorage.setItem('tea-ceremony:rooms', '{nope')
  expect(savedRooms()).toEqual([])
})
