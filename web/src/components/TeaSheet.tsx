import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { api, SCORE_FIELDS, type Participant, type Tea } from '../lib/api'
import { fmt } from '../lib/format'
import { tinStyle } from '../lib/tins'
import { RatingForm } from './RatingForm'
import { Sheet } from './Sheet'
import { TeaForm } from './TeaForm'

type Props = {
  slug: string
  token: string
  me: Participant
  tea: Tea | null
  index: number
  onClose: () => void
}

export function TeaSheet({ slug, token, me, tea, index, onClose }: Props) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['teas', slug] })
    queryClient.invalidateQueries({ queryKey: ['analytics', slug] })
  }

  const rate = useMutation({
    mutationFn: (rating: Parameters<typeof api.rate>[3]) => api.rate(slug, token, tea!.id, rating),
    onSuccess: () => {
      refresh()
      onClose()
    },
  })
  const edit = useMutation({
    mutationFn: (body: Parameters<typeof api.editTea>[3]) => api.editTea(slug, token, tea!.id, body),
    onSuccess: () => {
      refresh()
      setEditing(false)
    },
  })
  const remove = useMutation({
    mutationFn: () => api.deleteTea(slug, token, tea!.id),
    onSuccess: () => {
      refresh()
      onClose()
    },
  })

  const close = () => {
    setEditing(false)
    setConfirmDelete(false)
    onClose()
  }
  const mine = tea?.created_by?.id === me.id || !tea?.created_by

  return (
    <Sheet
      open={tea !== null}
      onClose={close}
      eyebrow={`Tea ${index + 1}`}
      title={tea?.name ?? ''}
      headStyle={tinStyle(index)}
    >
      {tea && editing && (
        <TeaForm
          initial={tea}
          submitLabel="Save changes"
          pending={edit.isPending}
          error={edit.error?.message ?? null}
          onSubmit={(body) => edit.mutate(body)}
        />
      )}
      {tea && !editing && (
        <>
          {(tea.ingredients.length > 0 || tea.notes) && (
            <div className="info">
              {tea.ingredients.length > 0 && (
                <div className="chips">
                  {tea.ingredients.map((i) => (
                    <span className="chip" key={i}>
                      {i}
                    </span>
                  ))}
                </div>
              )}
              {tea.notes && <p className="muted pre">{tea.notes}</p>}
            </div>
          )}
          <RatingForm
            key={tea.id}
            initial={tea.my_rating}
            pending={rate.isPending}
            error={rate.error?.message ?? null}
            onSubmit={(rating) => rate.mutate(rating)}
          />

          {tea.ratings ? (
            <div className="stack-sm">
              <span className="label">Everyone's scores</span>
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
                    {tea.ratings.map((r) => (
                      <tr key={r.participant.id}>
                        <td>
                          {r.participant.display_name}
                          {r.note && <div className="muted note">“{r.note}”</div>}
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
              {tea.average_overall != null && (
                <p className="muted">Average overall: {fmt(tea.average_overall)}</p>
              )}
            </div>
          ) : (
            tea.rating_count > 0 && (
              <p className="muted">
                {tea.rating_count} {tea.rating_count === 1 ? 'person has' : 'people have'} rated
                this. Their scores show after you save yours.
              </p>
            )
          )}

          <div className="actions row-end">
            {tea.created_by && <span className="muted small">Added by {tea.created_by.display_name}</span>}
            <button className="ghost small" onClick={() => setEditing(true)}>
              Edit tea
            </button>
            {mine &&
              (confirmDelete ? (
                <>
                  <button className="danger small" onClick={() => remove.mutate()} disabled={remove.isPending}>
                    Delete for everyone
                  </button>
                  <button className="ghost small" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </button>
                </>
              ) : (
                <button className="ghost small" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              ))}
          </div>
          {remove.error && <p className="error">{remove.error.message}</p>}
        </>
      )}
    </Sheet>
  )
}
