import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { api, type Ingredient } from '../lib/api'
import { useIngredients } from '../lib/queries'
import { useConfirm } from './Confirm'

export function IngredientsView({ token, search }: { token: string; search: string }) {
  const { data, error, isPending } = useIngredients(token)
  const [message, setMessage] = useState<string | null>(null)

  if (isPending) return <p className="muted">Loading…</p>
  if (error) return <p className="error">{error.message}</p>
  if (data.length === 0)
    return <div className="notice">No ingredients yet. They appear here when you add them to a tea.</div>

  const query = search.trim().toLowerCase()
  const shown = data.filter((i) => !query || i.name.toLowerCase().includes(query))

  return (
    <section className="stack-sm">
      <p className="muted small">
        Shared by every tea in the app. Rename one to fix a typo everywhere. Renaming it to a name that
        already exists merges the two.
      </p>
      {message && <div className="notice small">{message}</div>}
      {shown.length === 0 ? (
        <p className="muted small">No ingredient matches “{search.trim()}”.</p>
      ) : (
        <ul className="agreement">
          {shown.map((ingredient) => (
            <IngredientRow key={ingredient.id} token={token} ingredient={ingredient} onMessage={setMessage} />
          ))}
        </ul>
      )}
    </section>
  )
}

type RowProps = { token: string; ingredient: Ingredient; onMessage: (message: string | null) => void }

function IngredientRow({ token, ingredient, onMessage }: RowProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'view' | 'rename'>('view')
  const [confirmDialog, confirm] = useConfirm()
  const [name, setName] = useState(ingredient.name)
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['catalog'] })
    queryClient.invalidateQueries({ queryKey: ['teas'] })
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }

  const update = useMutation({
    mutationFn: (name: string) => api.renameIngredient(token, ingredient.id, name),
    onSuccess: (result) => {
      setMode('view')
      onMessage(result.merged ? `Merged “${ingredient.name}” into “${result.ingredient.name}”.` : null)
      refresh()
    },
  })
  const remove = useMutation({
    mutationFn: () => api.deleteIngredient(token, ingredient.id),
    onSuccess: () => {
      onMessage(null)
      refresh()
    },
  })

  if (mode === 'rename')
    return (
      <li>
        <form
          className="inline-edit"
          onSubmit={(e) => {
            e.preventDefault()
            update.mutate(name)
          }}
        >
          <input
            aria-label="Ingredient name"
            autoFocus
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="primary small" disabled={update.isPending}>
            Save
          </button>
          <button
            type="button"
            className="ghost small"
            onClick={() => {
              setMode('view')
              setName(ingredient.name)
            }}
          >
            Cancel
          </button>
        </form>
        {update.error && <p className="error">{update.error.message}</p>}
      </li>
    )

  return (
    <li>
      <span className="ingredient-head">
        <span className="tea-main">
          <b className="strong">{ingredient.name}</b>
          <span className="tea-sub">
            {ingredient.tea_count === 0
              ? 'Not used in any tea'
              : `In ${ingredient.tea_count} ${ingredient.tea_count === 1 ? 'tea' : 'teas'}`}
          </span>
        </span>
      </span>
      <span className="actions">
          <button className="ghost small" onClick={() => setMode('rename')}>
            Rename
          </button>
          <button
            className="ghost small danger-text"
            onClick={() =>
              confirm({
                title: 'Delete this ingredient?',
                message: `“${ingredient.name}” will be removed from ${
                  ingredient.tea_count === 1 ? 'the 1 tea' : `all ${ingredient.tea_count} teas`
                } that list it, for everyone. This can't be undone.`,
                confirmLabel: 'Delete ingredient',
                danger: true,
                action: () => remove.mutateAsync(),
              })
            }
          >
            Delete
          </button>
      </span>
      {confirmDialog}
      {(update.error || remove.error) && (
        <p className="error">{(update.error ?? remove.error)!.message}</p>
      )}
    </li>
  )
}
