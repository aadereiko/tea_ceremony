import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { AnalyticsView } from '../components/AnalyticsView'
import { Heading } from '../components/KindIcon'
import { api } from '../lib/api'
import { tokenFor } from '../lib/sessions'

export function AnalyticsPage() {
  const slug = (useParams().slug ?? '').toLowerCase()
  const token = tokenFor(slug)
  const room = useQuery({
    queryKey: ['room', slug],
    queryFn: () => api.room(slug, token!),
    enabled: token !== null,
  })

  return (
    <main className="wrap">
      <Link to={`/r/${slug}`} className="back-link">
        ‹ Back to {room.data?.room.name ?? 'the room'}
      </Link>
      <Heading kind="chart">Analytics</Heading>
      {token ? (
        <AnalyticsView slug={slug} token={token} />
      ) : (
        <p className="muted">Join this room first to see its analytics.</p>
      )}
    </main>
  )
}
