import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'

import { api, SCORE_FIELDS, shownTea, teaInput, type Participant, type IngredientRef, type Rating, type RatingInput, type Tasting } from '../lib/api'
import { flag } from '../lib/countries'
import { fmt } from '../lib/format'
import { useIngredients, useShops } from '../lib/queries'
import { Explain } from './Explain'
import { IngredientPhoto } from './IngredientPhoto'
import { IngredientSheet } from './IngredientSheet'
import { KindIcon } from './KindIcon'
import { RatingForm } from './RatingForm'
import { Sheet } from './Sheet'
import { TeaForm } from './TeaForm'
import { TeaBadge } from './TeaBadge'
import { ItemIcon } from './ItemIcon'
import { useConfirm } from './Confirm'

type Props = {
  slug: string
  token: string
  me: Participant
  tasting: Tasting | null
  index: number
  blind: boolean
  hideScores: boolean
  onClose: () => void
}

export function TeaSheet({ slug, token, me, tasting, index, blind, hideScores, onClose }: Props) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [confirmDialog, confirm] = useConfirm()
  const [showNotes, setShowNotes] = useState(false)
  const known = useIngredients(token).data ?? []
  const [openIngredient, setOpenIngredient] = useState<IngredientRef | null>(null)
  const shops = useShops(token).data ?? []
  const refresh = () => {
    for (const key of [['teas', slug], ['analytics', slug], ['catalog']])
      queryClient.invalidateQueries({ queryKey: key })
  }
  // The server answers with the updated tea, so show it at once instead of waiting for the
  // whole list to be fetched again.
  const applyUpdate = (updated: Tasting) => {
    queryClient.setQueryData<Tasting[]>(['teas', slug], (list) =>
      list?.map((t) => (t.id === updated.id ? updated : t)),
    )
    refresh()
  }

  const rate = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: RatingInput }) => api.rate(slug, token, id, rating),
    onSuccess: applyUpdate,
  })
  const edit = useMutation({
    mutationFn: (body: Parameters<typeof api.editCatalogTea>[2]) =>
      api.editCatalogTea(token, tasting!.tea!.id, body),
    onSuccess: () => {
      refresh()
      setEditing(false)
    },
  })
  const reveal = useMutation({
    mutationFn: (revealed: boolean) => api.setVisibility(slug, token, tasting!.id, { revealed }),
    onSuccess: applyUpdate,
  })
  const revealScores = useMutation({
    mutationFn: (shown: boolean) => api.setVisibility(slug, token, tasting!.id, { scores_revealed: shown }),
    onSuccess: applyUpdate,
  })
  const remove = useMutation({
    mutationFn: () => api.removeTasting(slug, token, tasting!.id),
    onSuccess: () => {
      refresh()
      onClose()
    },
  })

  const close = () => {
    setEditing(false)
    setShowNotes(false)
    reveal.reset()
    revealScores.reset()
    onClose()
  }
  const tea = tasting?.tea ?? null
  const shown = tasting ? shownTea(tasting, index + 1) : null
  const othersWithNotes = tasting?.ratings?.filter((r) => r.note && !r.is_mine).length ?? 0
  const noteVisible = (r: Rating) => r.note && (r.is_mine || showNotes)
  const isHost = me.is_owner

  return (
    <Sheet
      open={tasting !== null}
      onClose={close}
      eyebrow={`Tea ${index + 1}`}
      title={
        <span className="sheet-title">
          {shown && <TeaBadge tea={shown} />}
          {shown?.name ?? ''}
        </span>
      }
    >
      {tasting && tea && editing && (
        <>
          {tea.room_count > 1 && (
            <div className="notice small">
              This tea is in {tea.room_count} rooms. Your changes show up in all of them.
            </div>
          )}
          <TeaForm
            initial={teaInput(tea)}
            known={known}
            shops={shops}
            submitLabel="Save changes"
            pending={edit.isPending}
            error={edit.error?.message ?? null}
            onSubmit={(body) => edit.mutate(body)}
          />
        </>
      )}
      {tasting && !editing && (
        <>
          {tea && tea.ingredients.length > 0 && (
            <div className="info chips" aria-label="Ingredients">
              {tea.ingredients.map((i) => (
                <button type="button" className="chip chip-button" key={i.id} onClick={() => setOpenIngredient(i)}>
                  <IngredientPhoto ingredient={i} size={22} zoomable={false} />
                  {i.name}
                </button>
              ))}
            </div>
          )}
          {tea && tea.shops.length > 0 && (
            <div className="info chips" aria-label="Where to buy">
              {tea.shops.map((shop) => (
                <Link key={shop.id} to={`/shops/${shop.id}`} className="chip shop-chip">
                  <KindIcon kind="shop" size={15} />
                  {flag(shop.country)} {shop.name}
                  <span className="muted">{shop.city}</span>
                </Link>
              ))}
            </div>
          )}
          {tasting.notes && (
            <div className="info">
              <p className="muted pre">{tasting.notes}</p>
            </div>
          )}
          <RatingForm
            key={tasting.id}
            initial={tasting.my_rating}
            saving={rate.isPending}
            error={rate.error?.message ?? null}
            onSave={(rating) => rate.mutate({ id: tasting.id, rating })}
          />

          {(blind || tasting.rating_count > 0) && (
            <div className="stack-sm">
              <div className="row-between">
                <span className="muted">
                  {tasting.rating_count === 0
                    ? 'Nobody has rated this yet'
                    : `${tasting.rating_count} ${tasting.rating_count === 1 ? 'person has' : 'people have'} rated this`}
                </span>
                <span className="actions">
                  {blind && (
                    <button
                      className="ghost small with-icon tip tip-end"
                      data-tip={
                        tasting.hidden
                          ? 'The name, ingredients and colour stay hidden until someone reveals them. Revealing shows them to everyone in the room.'
                          : 'Make this a mystery tea again, for everyone in the room.'
                      }
                      onClick={() =>
                        tasting.hidden
                          ? confirm({
                              title: 'Reveal this tea?',
                              message:
                                'Its name, ingredients and colour will be shown to everyone in the room. You can hide it again later.',
                              confirmLabel: 'Reveal tea',
                              action: () => reveal.mutateAsync(true),
                            })
                          : reveal.mutate(false)
                      }
                      disabled={reveal.isPending}
                    >
                      <KindIcon kind={tasting.hidden ? 'eye' : 'eye-off'} size={16} />
                      {tasting.hidden ? 'Reveal tea' : 'Hide tea'}
                    </button>
                  )}
                  {hideScores && tasting.rating_count > 0 && (
                    <button
                      className="ghost small with-icon tip tip-end"
                      data-tip={
                        tasting.scores_revealed
                          ? "Hide everyone's scores and names again, for everyone in the room."
                          : 'Scores and names stay hidden until someone reveals them. Revealing shows them to everyone in the room.'
                      }
                      onClick={() =>
                        tasting.scores_revealed
                          ? revealScores.mutate(false)
                          : confirm({
                              title: 'Reveal the scores?',
                              message:
                                "Everyone's scores and names for this tea will be shown to the whole room. You can hide them again later.",
                              confirmLabel: 'Reveal scores',
                              action: () => revealScores.mutateAsync(true),
                            })
                      }
                      disabled={revealScores.isPending}
                    >
                      <KindIcon kind={tasting.scores_revealed ? 'eye-off' : 'eye'} size={16} />
                      {tasting.scores_revealed ? 'Hide scores' : 'Reveal scores'}
                    </button>
                  )}
                </span>
              </div>
              {(reveal.error ?? revealScores.error) && (
                <p className="error">{(reveal.error ?? revealScores.error)!.message}</p>
              )}
            </div>
          )}

          {tasting.ratings ? (
            <div className="stack-sm">
              <div className="row-between">
                <span className="label with-icon">
                  <KindIcon kind="person" size={16} />
                  Everyone's scores
                </span>
                <span className="actions">
                  {othersWithNotes > 0 && (
                    <button className="ghost small" onClick={() => setShowNotes(!showNotes)} aria-expanded={showNotes}>
                      {showNotes ? 'Hide notes' : `Show notes (${othersWithNotes})`}
                    </button>
                  )}
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Taster</th>
                      {SCORE_FIELDS.map((f) => (
                        <th key={f}>{f}</th>
                      ))}
                      <th>Buy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasting.ratings.map((r, i) => (
                      <tr key={r.participant?.id ?? i}>
                        <td>
                          {r.participant ? (
                            <span className="with-icon">
                              <ItemIcon name={r.participant.icon} colorFrom={r.participant.display_name} size={18} />
                              {r.participant.display_name}
                            </span>
                          ) : (
                            <span className="muted">{r.is_mine ? 'You' : 'Anonymous'}</span>
                          )}
                          {noteVisible(r) && <div className="muted note">“{r.note}”</div>}
                        </td>
                        {SCORE_FIELDS.map((f) => (
                          <td key={f}>{r[f] ?? '–'}</td>
                        ))}
                        <td>{r.buy_again == null ? '–' : r.buy_again ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tasting.average_overall != null && (
                <p className="muted">
                  Average overall:{' '}
                  <Explain title="Average Overall" text="The plain average of everyone's Overall score for this tea in this room.">
                    {fmt(tasting.average_overall)}
                  </Explain>
                </p>
              )}
            </div>
          ) : null}

          <div className="actions row-end">
            {tasting.added_by && (
              <span className="muted small">
                Added by {tasting.added_by.display_name}
              </span>
            )}
            {isHost && tea && (
              <button className="ghost small" onClick={() => setEditing(true)}>
                Edit tea
              </button>
            )}
            {isHost && (
              <button
                className="ghost small"
                onClick={() =>
                  confirm({
                    title: 'Remove this tea from the room?',
                    message: `“${shown?.name}” and everyone's ratings for it will be removed from this room. The tea stays in the catalog.`,
                    confirmLabel: 'Remove tea',
                    danger: true,
                    action: () => remove.mutateAsync(),
                  })
                }
              >
                Remove
              </button>
            )}
          </div>
        </>
      )}
      {confirmDialog}
      <IngredientSheet token={token} ingredient={openIngredient} onClose={() => setOpenIngredient(null)} />
    </Sheet>
  )
}
