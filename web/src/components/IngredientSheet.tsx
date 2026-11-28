import { Link } from 'react-router'

import type { IngredientRef } from '../lib/api'
import { useCatalogTeas } from '../lib/queries'
import { IngredientPhoto } from './IngredientPhoto'
import { Sheet } from './Sheet'
import { TeaBadge } from './TeaBadge'

type Props = { token: string; ingredient: IngredientRef | null; onClose: () => void }

export function IngredientSheet({ token, ingredient, onClose }: Props) {
  const { data, isPending, error } = useCatalogTeas(ingredient ? token : null)
  const teas = (data ?? []).filter((t) => t.ingredients.some((i) => i.id === ingredient?.id))

  return (
    <Sheet open={ingredient !== null} onClose={onClose} eyebrow="Ingredient" title={ingredient?.name}>
      {ingredient && (
        <div className="stack">
          {ingredient.image_url && (
            <div className="ingredient-hero">
              <IngredientPhoto ingredient={ingredient} size={88} />
              {ingredient.image_credit && <span className="photo-credit">{ingredient.image_credit}</span>}
            </div>
          )}
          {isPending ? (
            <p className="muted">Loading…</p>
          ) : error ? (
            <p className="error">{error.message}</p>
          ) : teas.length === 0 ? (
            <div className="notice small">No tea in the catalog has this ingredient yet.</div>
          ) : (
            <section className="stack-sm">
              <span className="label">
                In {teas.length} {teas.length === 1 ? 'tea' : 'teas'}
              </span>
              <ul className="tea-list">
                {teas.map((tea) => (
                  <li key={tea.id}>
                    <Link to={`/catalog?tea=${tea.id}`} className="tea-row" onClick={onClose}>
                      <TeaBadge tea={tea} />
                      <span className="tea-main">
                        <span className="tea-name">{tea.name}</span>
                        <span className="tea-sub">{tea.ingredients.map((g) => g.name).join(', ')}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Sheet>
  )
}
