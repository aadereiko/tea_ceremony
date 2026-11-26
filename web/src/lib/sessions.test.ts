import type { Session } from './api'
import { forgetRoom, rememberSession, saveRoom, savedProfile, savedRooms, tokenFor } from './sessions'

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

test('joining a room remembers your name and animal for next time', () => {
  expect(savedProfile()).toEqual({ name: '', icon: null })
  rememberSession({
    token: 't',
    room: { slug: 'a', name: 'A', icon: 'moon', blind: false, anonymous: false, participants: [] },
    me: { id: '1', display_name: 'Sashka', icon: 'fox', is_owner: true },
  } satisfies Session)
  expect(savedProfile()).toEqual({ name: 'Sashka', icon: 'fox' })
})

test('without a saved profile the name comes from the latest room', () => {
  saveRoom({ slug: 'a', name: 'A', token: 't1', me: 'Ola' })
  expect(savedProfile()).toEqual({ name: 'Ola', icon: null })
})
