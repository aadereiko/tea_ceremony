import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { api, type TeaInput } from '../lib/api'
import { useCatalogTeas, useIngredients } from '../lib/queries'
import { KindIcon } from './KindIcon'
import { Sheet } from './Sheet'
import { TeaForm } from './TeaForm'
import { TeaBadge } from './TeaBadge'

type Props = {
  open: boolean
  slug: string
  token: string
  roomName: string
  inRoom: Set<string>
  onClose: () => void
}

export function AddTeaSheet({ open, slug, token, roomName, inRoom, onClose }: Props) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const catalog = useCatalogTeas(token)
  const known = useIngredients(token).data ?? []

  const add = useMutation({
    mutationFn: (body: { tea_id: string } | { new_tea: TeaInput }) => api.addTasting(slug, token, body),
    onSuccess: () => {
      for (const key of [['teas', slug], ['catalog']]) queryClient.invalidateQueries({ queryKey: key })
      close()
    },
  })

  const close = () => {
    setSearch('')
    setCreating(false)
    add.reset()
    onClose()
  }

  const query = search.trim().toLowerCase()
  const exact = (catalog.data ?? []).some((t) => t.name.toLowerCase() === query)
  const newName = exact ? '' : search.trim()
  const available = (catalog.data ?? []).filter(
    (t) =>
      !inRoom.has(t.id) &&
      (!query ||
        t.name.toLowerCase().includes(query) ||
        t.ingredients.some((i) => i.name.toLowerCase().includes(query))),
  )

  return (
    <Sheet open={open} onClose={close} eyebrow={roomName} title={creating ? 'New tea' : 'Add tea'}>
      {creating ? (
        <>
          <TeaForm
            key="new"
            initial={{ name: newName, ingredients: [], icon: null, color: null, notes: '' }}
            known={known}
            submitLabel="Add to catalog and room"
            pending={add.isPending}
            error={add.error?.message ?? null}
            onSubmit={(new_tea) => add.mutate({ new_tea })}
          />
          <button className="ghost small" onClick={() => setCreating(false)}>
            ‹ Back to the catalog
          </button>
        </>
      ) : (
        <>
          <input
            type="search"
            data-autofocus
            placeholder="Search teas or ingredients"
            aria-label="Search the catalog"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {add.error && <p className="error">{add.error.message}</p>}
          {catalog.isPending ? (
            <p className="muted">Loading the catalog…</p>
          ) : available.length > 0 ? (
            <ul className="tea-list">
              {available.map((tea) => (
                <li key={tea.id}>
                  <button
                    className="tea-row"
                    disabled={add.isPending}
                    onClick={() => add.mutate({ tea_id: tea.id })}
                  >
                    <TeaBadge tea={tea} />
                    <span className="tea-main">
                      <span className="tea-name">{tea.name}</span>
                      <span className="tea-sub">
                        {tea.ingredients.map((g) => g.name).join(', ') || 'No ingredients'}
                      </span>
                    </span>
                    <span className="rate-pill">Add</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small with-icon">
              <KindIcon kind="catalog" size={16} />
              {query
                ? `Nothing in the catalog matches “${search.trim()}”.`
                : catalog.data?.length
                  ? 'Every catalog tea is already in this room.'
                  : 'The catalog is empty. Create the first tea.'}
            </p>
          )}
          <button
            className="primary"
            onClick={() => {
              add.reset()
              setCreating(true)
            }}
          >
            + {newName ? `Create “${newName}”` : 'Create a new tea'}
          </button>
        </>
      )}
    </Sheet>
  )
}
