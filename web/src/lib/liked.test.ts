import type { RatingInput } from './api'
import { isLiked } from './liked'

const rating = (overall: number | null, buy_again: boolean | null): RatingInput => ({
  smell: null,
  taste: null,
  finish: null,
  overall,
  buy_again,
  note: '',
})

test('a tea is liked with a high overall score or a yes to buying again', () => {
  expect(isLiked(rating(7, null))).toBe(true)
  expect(isLiked(rating(3, true))).toBe(true)
  expect(isLiked(rating(6, false))).toBe(false)
  expect(isLiked(rating(null, null))).toBe(false)
  expect(isLiked(null)).toBe(false)
})
