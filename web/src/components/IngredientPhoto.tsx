import { useRef, type MouseEvent } from 'react'

import type { IngredientRef } from '../lib/api'

type Props = { ingredient: IngredientRef; size: number; zoomable?: boolean }

export function IngredientPhoto({ ingredient, size, zoomable = true }: Props) {
  const viewer = useRef<HTMLDialogElement>(null)
  if (!ingredient.image_url) return null

  const img = (
    <img className="ingredient-photo" src={ingredient.image_url} alt="" width={size} height={size} loading="lazy" />
  )
  if (!zoomable) return img

  const open = (e: MouseEvent) => {
    // The photo often sits inside a clickable row or chip that would also react to the tap.
    e.preventDefault()
    e.stopPropagation()
    viewer.current?.showModal()
  }

  return (
    <>
      <button type="button" className="photo-zoom" aria-label={`Show photo of ${ingredient.name}`} onClick={open}>
        {img}
      </button>
      <dialog
        ref={viewer}
        className="photo-viewer"
        aria-label={`Photo of ${ingredient.name}`}
        onClick={(e) => {
          e.stopPropagation()
          if (e.target === e.currentTarget) viewer.current?.close()
        }}
      >
        <img src={ingredient.image_url} alt={ingredient.name} />
        <div className="photo-viewer-text">
          <b>{ingredient.name}</b>
          {ingredient.image_credit && <span className="muted small">{ingredient.image_credit}</span>}
          <span className="actions">
            {ingredient.image_source && (
              <a className="ghost small" href={ingredient.image_source} target="_blank" rel="noopener noreferrer">
                View original
              </a>
            )}
            <button type="button" className="ghost small" onClick={() => viewer.current?.close()}>
              Close
            </button>
          </span>
        </div>
      </dialog>
    </>
  )
}
