import type { RatingInput } from './api'

export const LIKED_FROM = 7

export function isLiked(rating: RatingInput | null): rating is RatingInput {
  return rating !== null && (rating.buy_again === true || (rating.overall ?? 0) >= LIKED_FROM)
}
