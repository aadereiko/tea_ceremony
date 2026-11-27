import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useConfirm } from '../components/Confirm'
import { Explain } from '../components/Explain'
import { ItemIcon } from '../components/ItemIcon'
import { Heading } from '../components/KindIcon'
import { Scale } from '../components/RatingForm'
import { Sheet } from '../components/Sheet'
import { ShopForm } from '../components/ShopForm'
import { ShopMap } from '../components/ShopMap'
import { TeaBadge } from '../components/TeaBadge'
import { api, type Shop, type ShopAuthor, type ShopInput } from '../lib/api'
import { countryName, flag } from '../lib/countries'
import { fmt } from '../lib/format'
import { catalogToken } from '../lib/sessions'

function Author({ author }: { author: ShopAuthor }) {
  return (
    <span className="with-icon">
      <ItemIcon name={author.icon} colorFrom={author.name} size={18} />
      <b>{author.is_me ? `${author.name} (you)` : author.name}</b>
    </span>
  )
}

export function ShopPage() {
  const { id = '' } = useParams()
  const token = catalogToken()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [comment, setComment] = useState('')
  const [confirmDialog, confirm] = useConfirm()
  const { data: shop, error, isPending } = useQuery({
    queryKey: ['shops', id],
    queryFn: () => api.shop(token!, id),
    enabled: token !== null,
  })
  const saved = (next: Shop) => {
    queryClient.setQueryData(['shops', id], next)
    queryClient.invalidateQueries({ queryKey: ['shops'], exact: true })
  }
  const edit = useMutation({
    mutationFn: (body: ShopInput) => api.editShop(token!, id, body),
    onSuccess: (next) => {
      saved(next)
      setEditing(false)
    },
  })
  const score = useMutation({ mutationFn: (value: number | null) => api.scoreShop(token!, id, value), onSuccess: saved })
  const post = useMutation({
    mutationFn: (text: string) => api.commentOnShop(token!, id, text),
    onSuccess: (next) => {
      saved(next)
      setComment('')
    },
  })
  const unpost = useMutation({ mutationFn: (commentId: string) => api.deleteShopComment(token!, id, commentId), onSuccess: saved })
  const remove = useMutation({
    mutationFn: () => api.deleteShop(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      navigate('/shops')
    },
  })

  if (!token) return <main className="wrap narrow"><div className="notice">Join a room first to see tea shops.</div></main>
  if (isPending) return <main className="wrap"><p className="muted">Loading…</p></main>
  if (error) return <main className="wrap"><p className="error">{error.message}</p></main>

  const mapsLink = shop.latitude !== null
    ? `https://www.openstreetmap.org/?mlat=${shop.latitude}&mlon=${shop.longitude}#map=17/${shop.latitude}/${shop.longitude}`
    : null

  return (
    <main className="wrap">
      <header className="room-head">
        <Link to="/shops" className="back-link">
          ‹ Tea shops
        </Link>
        <div className="room-title">
          <div className="grow">
            <h1>{shop.name}</h1>
            <span className="muted small">
              {flag(shop.country)} {[shop.address, shop.city, countryName(shop.country)].filter(Boolean).join(', ')}
            </span>
          </div>
          <span className="shop-score big">
            <Explain
              title="Average score"
              text={
                shop.score_count === 0
                  ? 'Nobody has scored this shop yet. Be the first below.'
                  : `The average of ${shop.score_count} ${shop.score_count === 1 ? "person's score" : "people's scores"} for this shop, from 0 to 10.`
              }
            >
              {fmt(shop.average_score)}
            </Explain>
            <small className="muted">
              {shop.score_count} {shop.score_count === 1 ? 'score' : 'scores'}
            </small>
          </span>
        </div>
        <div className="actions">
          {shop.website && (
            <a className="ghost small" href={shop.website} target="_blank" rel="noopener noreferrer">
              Website
            </a>
          )}
          {mapsLink && (
            <a className="ghost small" href={mapsLink} target="_blank" rel="noopener noreferrer">
              Directions
            </a>
          )}
          <button className="ghost small" onClick={() => { edit.reset(); setEditing(true) }}>
            Edit
          </button>
          <button
            className="ghost small danger-text"
            onClick={() =>
              confirm({
                title: 'Delete this shop?',
                message: `“${shop.name}” and its scores and comments will be removed for everyone. This can't be undone.`,
                confirmLabel: 'Delete shop',
                danger: true,
                action: () => remove.mutateAsync(),
              })
            }
          >
            Delete
          </button>
        </div>
        {remove.error && <p className="error">{remove.error.message}</p>}
      </header>

      {shop.latitude !== null && shop.longitude !== null ? (
        <ShopMap height={260} pins={[{ id: shop.id, lat: shop.latitude, lng: shop.longitude, label: shop.name }]} />
      ) : (
        <div className="notice small">No location yet. Edit the shop to put it on the map.</div>
      )}

      <section className="panel stack-sm">
        <Heading kind="tea" level={3}>
          Teas sold here
        </Heading>
        {shop.teas.length === 0 ? (
          <p className="muted small">No teas linked yet. Open a tea in the catalog and add this shop under “Where to buy”.</p>
        ) : (
          <ul className="tea-list">
            {shop.teas.map((tea) => (
              <li key={tea.id} className="tea-row static">
                <TeaBadge tea={tea} />
                <span className="tea-main">
                  <span className="tea-name">{tea.name}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel stack-sm">
        <Heading kind="heart" level={3}>
          Your score
        </Heading>
        <p className="muted small">How much you like this shop, from 0 to 10. Tap your score again to remove it.</p>
        <Scale label="Your score" value={shop.my_score} onPick={(v) => score.mutate(v === shop.my_score ? null : v)} />
        {score.error && <p className="error">{score.error.message}</p>}
        {shop.scores.length > 0 && (
          <ul className="agreement">
            {shop.scores.map((s, i) => (
              <li key={i}>
                <Author author={s.author} />
                <Explain className="score" title={`${s.author.name}'s score`} text="How much they like this shop, from 0 to 10.">
                  {s.score}
                </Explain>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel stack-sm">
        <Heading kind="person" level={3}>
          Comments
        </Heading>
        {shop.comments.length === 0 && <p className="muted small">No comments yet. What do they sell? Is it worth the trip?</p>}
        <ul className="shop-comments">
          {shop.comments.map((c) => (
            <li key={c.id}>
              <div className="row-between">
                <Author author={c.author} />
                <span className="comment-meta muted small">
                  {new Date(c.created_at).toLocaleDateString()}
                  {c.author.is_me && (
                    <button className="ghost small danger-text" disabled={unpost.isPending} onClick={() => unpost.mutate(c.id)}>
                      Delete
                    </button>
                  )}
                </span>
              </div>
              <p className="pre">{c.text}</p>
            </li>
          ))}
        </ul>
        <form
          className="stack-sm"
          onSubmit={(e) => {
            e.preventDefault()
            if (comment.trim()) post.mutate(comment)
          }}
        >
          <textarea aria-label="Your comment" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Great puerh selection, friendly staff…" />
          {post.error && <p className="error">{post.error.message}</p>}
          <button className="primary" disabled={post.isPending || !comment.trim()}>
            {post.isPending ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      </section>

      <Sheet open={editing} onClose={() => setEditing(false)} eyebrow="Tea shops" title="Edit shop">
        {editing && (
          <ShopForm
            initial={shop}
            submitLabel="Save changes"
            pending={edit.isPending}
            error={edit.error?.message ?? null}
            onSubmit={(body) => edit.mutate(body)}
          />
        )}
      </Sheet>
      {confirmDialog}
    </main>
  )
}
