import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { IngredientPhoto } from '../components/IngredientPhoto'
import { ItemIcon } from '../components/ItemIcon'
import { Leaf } from '../components/Leaf'
import { TeaBadge } from '../components/TeaBadge'
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
          <span className="notes-brand">
            <Leaf size={16} />
            Tea Ceremony
          </span>
          <div className="notes-title">
            {person ? (
              <ItemIcon name={person.icon} colorFrom={person.display_name} badge size={30} />
            ) : (
              <ItemIcon name={info.icon} colorFrom={info.name} badge size={30} />
            )}
            <div>
              <h1>{title}</h1>
              <p className="notes-meta">
                <span className="with-icon">
                  <ItemIcon name={info.icon} colorFrom={info.name} badge size={14} />
                  {info.name}
                </span>
                <span>{new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span>
                  {entries.length} {entries.length === 1 ? 'tea' : 'teas'}
                </span>
                {!person && <span>{info.participants.length} tasters</span>}
              </p>
            </div>
          </div>
        </header>

        {info.anonymous && person && person.id !== me.id ? (
          <p className="notes-empty">
            This room rates anonymously, so notes can't be shown for one person. Open the room notes instead.
          </p>
        ) : entries.length === 0 ? (
          <p className="notes-empty">No notes yet.</p>
        ) : (
          <div className="table-wrap notes-table-wrap">
            <table className="notes-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tea</th>
                  <th>Ingredients</th>
                  {!person && <th>Taster</th>}
                  {SCORE_FIELDS.map((f) => (
                    <th key={f}>{f}</th>
                  ))}
                  <th>Buy again</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {entries.flatMap(({ tasting, tea: shown, position, ratings }) => {
                  const rows = ratings?.length ? ratings : [null]
                  return rows.map((r, n) => (
                    <tr key={`${tasting.id}-${n}`} className={n === 0 ? 'tea-first' : 'tea-more'}>
                      {n === 0 && (
                        <>
                          <td rowSpan={rows.length} className="muted">
                            {position}
                          </td>
                          <td rowSpan={rows.length} className="notes-tea">
                            <span className="with-icon">
                              <TeaBadge tea={shown} size={16} />
                              <span>
                                <b>{shown.name}</b>
                                {teaColor(shown.color) && <small className="muted">{teaColor(shown.color)!.name}</small>}
                              </span>
                            </span>
                          </td>
                          <td rowSpan={rows.length} className="notes-ingredients">
                            {tasting.tea?.ingredients.map((g) => (
                              <span className="chip" key={g.id}>
                                <IngredientPhoto ingredient={g} size={16} zoomable={false} />
                                {g.name}
                              </span>
                            ))}
                          </td>
                        </>
                      )}
                      {r === null ? (
                        <td colSpan={SCORE_FIELDS.length + (person ? 2 : 3)} className="muted notes-missing">
                          {ratings === null ? 'Scores hidden until someone reveals them' : 'No ratings yet'}
                        </td>
                      ) : (
                        <>
                          {!person && (
                            <td className="notes-who">
                              <span className="with-icon">
                                {r.participant && (
                                  <ItemIcon name={r.participant.icon} colorFrom={r.participant.display_name} badge size={14} />
                                )}
                                {r.participant?.display_name ?? (r.is_mine ? 'You' : 'Anonymous')}
                              </span>
                            </td>
                          )}
                          {SCORE_FIELDS.map((f) => (
                            <td key={f}>
                              <span className={`score-tile${f === 'overall' ? ' main' : ''}`}>{r[f] ?? '–'}</span>
                            </td>
                          ))}
                          <td>
                            {r.buy_again != null && (
                              <span className={`buy-pill${r.buy_again ? ' yes' : ''}`}>{r.buy_again ? 'Yes' : 'No'}</span>
                            )}
                          </td>
                          <td className="note-cell">{r.note}</td>
                        </>
                      )}
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>
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
