import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router'

import { api, MYSTERY } from '../lib/api'
import { isLiked, LIKED_FROM } from '../lib/liked'
import type { SavedRoom } from '../lib/sessions'
import { Heading } from './KindIcon'
import { TeaBadge } from './TeaBadge'

export function LikedTeas({ rooms }: { rooms: SavedRoom[] }) {
  const results = useQueries({
    queries: rooms.map((room) => ({
      queryKey: ['teas', room.slug],
      queryFn: () => api.teas(room.slug, room.token),
      retry: false,
    })),
  })

  const liked = results
    .flatMap((result, i) =>
      (result.data ?? []).flatMap((tasting) =>
        isLiked(tasting.my_rating)
          ? [{ tasting, tea: tasting.tea ?? MYSTERY, rating: tasting.my_rating, room: rooms[i] }]
          : [],
      ),
    )
    .sort((a, b) => (b.rating.overall ?? -1) - (a.rating.overall ?? -1))
  const loading = results.some((r) => r.isPending)

  return (
    <section className="panel">
      <div className="row-between">
        <Heading kind="heart">Teas you liked</Heading>
        <span className="muted small">
          Overall {LIKED_FROM}+ or "buy again"
        </span>
      </div>
      {liked.length === 0 ? (
        <p className="muted small">
          {loading ? 'Loading…' : 'Nothing yet. Rate a tea highly and it shows up here.'}
        </p>
      ) : (
        <ul className="room-list">
          {liked.map(({ tasting, tea, rating, room }) => (
            <li key={tasting.id}>
              <Link to={`/r/${room.slug}?tea=${tasting.id}`} className="room-link">
                <TeaBadge tea={tea} />
                <span className="tea-main">
                  <b>{tea.name}</b>
                  <span className="tea-sub">
                    {room.name}
                    {rating.buy_again && ' · would buy again'}
                  </span>
                </span>
                {rating.overall != null && <span className="score-pill">{rating.overall}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
