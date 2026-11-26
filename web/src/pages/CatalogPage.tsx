import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { IngredientsView } from '../components/IngredientsView'
import { Heading, KindIcon } from '../components/KindIcon'
import { Sheet } from '../components/Sheet'
import { TeaForm } from '../components/TeaForm'
import { api, teaInput, type CatalogTea, type TeaInput } from '../lib/api'
import { useCatalogTeas, useIngredients } from '../lib/queries'
import { catalogToken } from '../lib/sessions'
import { TeaBadge } from '../components/TeaBadge'
import { useConfirm } from '../components/Confirm'

type Tab = 'teas' | 'ingredients'

export function CatalogPage() {
  const token = catalogToken()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'ingredients' ? 'ingredients' : 'teas'
  const [search, setSearch] = useState('')

  if (!token)
    return (
      <main className="wrap narrow">
        <div className="panel empty">
          <span className="brand">
            <KindIcon kind="catalog" size={26} />
          </span>
          <h2>Tea catalog</h2>
          <p className="muted center">Join or create a room first, then you can browse and edit the catalog.</p>
          <Link to="/" className="primary">
            Go to rooms
          </Link>
        </div>
      </main>
    )

  return (
    <main className="wrap">
      <header className="room-head">
        <Link to="/" className="back-link">
          ‹ My rooms
        </Link>
        <div className="room-title">
          <span className="brand">
            <KindIcon kind="catalog" size={22} />
          </span>
          <div className="grow">
            <h1>Tea catalog</h1>
            <span className="muted small">Every tea and ingredient anyone has added, shared by all rooms.</span>
          </div>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        {(['teas', 'ingredients'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className="tab"
            onClick={() => setSearchParams(t === 'teas' ? {} : { tab: t }, { replace: true })}
          >
            <KindIcon kind={t === 'teas' ? 'tea' : 'ingredient'} size={16} />
            {t === 'teas' ? 'Teas' : 'Ingredients'}
          </button>
        ))}
      </nav>

      <input
        type="search"
        placeholder={tab === 'teas' ? 'Search teas or ingredients' : 'Search ingredients'}
        aria-label="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {tab === 'teas' ? <CatalogTeas token={token} search={search} /> : <IngredientsView token={token} search={search} />}
    </main>
  )
}

function CatalogTeas({ token, search }: { token: string; search: string }) {
  const queryClient = useQueryClient()
  const { data, error, isPending } = useCatalogTeas(token)
  const known = useIngredients(token).data ?? []
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const create = useMutation({
    mutationFn: (body: TeaInput) => api.createCatalogTea(token, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
      setCreating(false)
    },
  })

  if (isPending) return <p className="muted">Loading…</p>
  if (error) return <p className="error">{error.message}</p>

  const query = search.trim().toLowerCase()
  const shown = data.filter(
    (t) =>
      !query ||
      t.name.toLowerCase().includes(query) ||
      t.ingredients.some((i) => i.name.toLowerCase().includes(query)),
  )
  const open = data.find((t) => t.id === openId) ?? null

  return (
    <section className="stack">
      <div className="row-between">
        <Heading kind="tea">
          Teas <span className="muted">{data.length}</span>
        </Heading>
        <button className="primary small" onClick={() => setCreating(true)}>
          + New tea
        </button>
      </div>
      {shown.length === 0 ? (
        <div className="notice">{data.length === 0 ? 'The catalog is empty. Add the first tea.' : 'No tea matches.'}</div>
      ) : (
        <ul className="tea-list">
          {shown.map((tea) => (
            <li key={tea.id}>
              <button className="tea-row" onClick={() => setOpenId(tea.id)}>
                <TeaBadge tea={tea} />
                <span className="tea-main">
                  <span className="tea-name">{tea.name}</span>
                  <span className="tea-sub">
                    {tea.ingredients.map((g) => g.name).join(', ') || 'No ingredients'}
                  </span>
                </span>
                <span className="count-pill with-icon" title="Rooms tasting it">
                  <KindIcon kind="room" size={14} />
                  {tea.room_count}
                </span>
                <span className="chev" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <CatalogTeaSheet token={token} tea={open} known={known} onClose={() => setOpenId(null)} />
      <Sheet open={creating} onClose={() => setCreating(false)} eyebrow="Tea catalog" title="New tea">
        <TeaForm
          initial={{ name: search.trim(), ingredients: [], icon: null, color: null, notes: '' }}
          known={known}
          submitLabel="Add to catalog"
          pending={create.isPending}
          error={create.error?.message ?? null}
          onSubmit={(body) => create.mutate(body)}
        />
      </Sheet>
    </section>
  )
}

type SheetProps = {
  token: string
  tea: CatalogTea | null
  known: Parameters<typeof TeaForm>[0]['known']
  onClose: () => void
}

function CatalogTeaSheet({ token, tea, known, onClose }: SheetProps) {
  const queryClient = useQueryClient()
  const [confirmDialog, confirm] = useConfirm()
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['catalog'] })
    queryClient.invalidateQueries({ queryKey: ['teas'] })
  }
  const close = () => {
    edit.reset()
    remove.reset()
    onClose()
  }
  const edit = useMutation({
    mutationFn: (body: TeaInput) => api.editCatalogTea(token, tea!.id, body),
    onSuccess: () => {
      refresh()
      close()
    },
  })
  const remove = useMutation({
    mutationFn: () => api.deleteCatalogTea(token, tea!.id),
    onSuccess: () => {
      refresh()
      close()
    },
  })

  return (
    <Sheet
      open={tea !== null}
      onClose={close}
      eyebrow="Tea catalog"
      title={
        <span className="sheet-title">
          {tea && <TeaBadge tea={tea} />}
          {tea?.name}
        </span>
      }
    >
      {tea && (
        <>
          {tea.room_count > 0 && (
            <div className="notice small with-icon">
              <KindIcon kind="room" size={16} />
              Tasted in {tea.room_count} {tea.room_count === 1 ? 'room' : 'rooms'}. Changes show up there too.
            </div>
          )}
          <TeaForm
            key={tea.id}
            initial={teaInput(tea)}
            known={known}
            submitLabel="Save changes"
            pending={edit.isPending}
            error={edit.error?.message ?? null}
            onSubmit={(body) => edit.mutate(body)}
          />
          <div className="actions row-end">
            <button
              className="ghost small danger-text"
              onClick={() =>
                confirm({
                  title: 'Delete this tea?',
                  message: `“${tea.name}” will be removed from the catalog for everyone. This can't be undone.`,
                  confirmLabel: 'Delete tea',
                  danger: true,
                  action: () => remove.mutateAsync(),
                })
              }
              disabled={tea.room_count > 0}
              title={tea.room_count > 0 ? 'Remove it from every room first' : undefined}
            >
              Delete tea
            </button>
          </div>
          {tea.room_count > 0 && (
            <p className="muted small">To delete this tea, first remove it from the rooms tasting it.</p>
          )}
          {remove.error && <p className="error">{remove.error.message}</p>}
        </>
      )}
      {confirmDialog}
    </Sheet>
  )
}
