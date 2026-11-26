import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { api, SCORE_FIELDS, shownTea, type Rating, type Tasting } from '../lib/api'
import { teaColor } from '../lib/icons'
import { tokenFor } from '../lib/sessions'

export function NotesPage() {
  const slug = (useParams().slug ?? '').toLowerCase()
  const [searchParams] = useSearchParams()
  const who = searchParams.get('who')
  const token = tokenFor(slug)
  const printed = useRef(false)

  const room = useQuery({ queryKey: ['room', slug], queryFn: () => api.room(slug, token!), enabled: !!token })
  const teas = useQuery({ queryKey: ['teas', slug], queryFn: () => api.teas(slug, token!), enabled: !!token })

  const info = room.data?.room
  const me = room.data?.me
  const person = who ? info?.participants.find((p) => p.id === who) : null
  const title = person ? `Notes by ${person.display_name}` : 'Room notes'
  const ready = room.isSuccess && teas.isSuccess

  useEffect(() => {
    if (!info) return
    // Browsers use the page title as the suggested PDF file name.
    document.title = `${info.name} – ${title}`
    return () => {
      document.title = 'Tea Ceremony'
    }
  }, [info, title])

  useEffect(() => {
    if (ready && searchParams.get('print') === '1' && !printed.current) {
      printed.current = true
      setTimeout(() => window.print(), 300)
    }
  }, [ready, searchParams])

  if (!token)
    return (
      <main className="wrap narrow">
        <p className="muted">Join this room first.</p>
        <Link to={`/r/${slug}`} className="back-link">
          ‹ Back to the room
        </Link>
      </main>
    )
  if (room.error || teas.error) return <main className="wrap"><p className="error">{(room.error ?? teas.error)!.message}</p></main>
  if (!ready || !info || !me) return <main className="wrap"><p className="muted">Preparing notes…</p></main>

  // In an anonymous room ratings carry no person, so "my notes" falls back to is_mine.
  const isBy = (r: Rating, personId: string) => (personId === me.id ? r.is_mine : r.participant?.id === personId)

  // null means "there are scores, but nobody has revealed them for this tea yet".
  const ratingsFor = (tasting: Tasting): Rating[] | null => {
    if (tasting.ratings) return person ? tasting.ratings.filter((r) => isBy(r, person.id)) : tasting.ratings
    if (person?.id === me.id)
      return tasting.my_rating ? [{ ...tasting.my_rating, participant: me, is_mine: true, updated_at: '' }] : []
    return tasting.rating_count > 0 ? null : []
  }

  const entries = teas.data
    .map((tasting, i) => ({ tasting, tea: shownTea(tasting, i + 1), position: i + 1, ratings: ratingsFor(tasting) }))
    .filter(({ ratings }) => !person || ratings === null || ratings.length > 0)
  const hidden = entries.some((e) => e.ratings === null)

  return (
    <main className="notes-page">
      <div className="notes-toolbar no-print">
        <Link to={`/r/${slug}`} className="back-link">
          ‹ Back to the room
        </Link>
        <button className="primary small" onClick={() => window.print()}>
          Save as PDF
        </button>
      </div>

      <article className="notes-sheet">
        <header className="notes-head">
          <p className="notes-eyebrow">Tea Ceremony · {info.name}</p>
          <h1>{title}</h1>
          <p className="notes-meta">
            {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
            {entries.length} {entries.length === 1 ? 'tea' : 'teas'}
            {!person && ` · ${info.participants.length} tasters`}
          </p>
        </header>

        {entries.length === 0 ? (
          <p className="notes-empty">No notes yet.</p>
        ) : (
          <table className="notes-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tea</th>
                <th>Brew</th>
                <th>Ingredients</th>
                {!person && <th>Taster</th>}
                {SCORE_FIELDS.map((f) => (
                  <th key={f} className="num">
                    {f[0].toUpperCase() + f.slice(1)}
                  </th>
                ))}
                <th>Buy again</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.flatMap(({ tasting, tea: shown, position, ratings }) => {
                const tea = [
                  <td key="n" className="num">
                    {position}
                  </td>,
                  <td key="t" className="strong">
                    {shown.name}
                  </td>,
                  <td key="b">{teaColor(shown.color)?.name ?? ''}</td>,
                  <td key="i">{tasting.tea?.ingredients.map((g) => g.name).join(', ')}</td>,
                ]
                const span = SCORE_FIELDS.length + (person ? 2 : 3)
                if (!ratings?.length)
                  return [
                    <tr key={tasting.id} className="notes-muted-row">
                      {tea}
                      <td colSpan={span}>
                        {ratings === null ? 'Hidden until someone reveals the scores' : 'No ratings yet'}
                      </td>
                    </tr>,
                  ]
                return ratings.map((r: Rating, n) => (
                  <tr key={`${tasting.id}-${r.participant?.id ?? n}`}>
                    {tea}
                    {!person && <td>{r.participant?.display_name ?? (r.is_mine ? 'You' : 'Anonymous')}</td>}
                    {SCORE_FIELDS.map((f) => (
                      <td key={f} className="num">
                        {r[f] ?? ''}
                      </td>
                    ))}
                    <td>{r.buy_again == null ? '' : r.buy_again ? 'Yes' : 'No'}</td>
                    <td className="note-cell">{r.note}</td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        )}

        {hidden && (
          <p className="notes-footnote">
            Scores stay hidden until someone in the room reveals them, so nobody copies. Press “Reveal scores” on a
            tea to include it.
          </p>
        )}
      </article>
    </main>
  )
}
