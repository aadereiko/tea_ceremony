import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { api, SCORE_FIELDS } from '../lib/api'
import { fmt, signed } from '../lib/format'
import { Heading } from './KindIcon'
import { ItemIcon } from './ItemIcon'
import { TeaBadge } from './TeaBadge'
import { Link } from 'react-router'

const MIN_TEA_OPTIONS = [1, 2, 3, 4]

function Bar({ value, max = 10 }: { value: number | null; max?: number }) {
  const width = value == null ? 0 : Math.max(2, (value / max) * 100)
  return (
    <span className="bar-track" aria-hidden="true">
      <span className="bar" style={{ width: `${width}%` }} />
    </span>
  )
}

function Diverging({ value, limit }: { value: number | null; limit: number }) {
  if (value == null) return <span className="div-track" aria-hidden="true" />
  const half = Math.min(Math.abs(value) / limit, 1) * 50
  return (
    <span className="div-track" aria-hidden="true">
      <span
        className={`div-bar ${value >= 0 ? 'pos' : 'neg'}`}
        style={value >= 0 ? { left: '50%', width: `${half}%` } : { right: '50%', width: `${half}%` }}
      />
    </span>
  )
}

export function AnalyticsView({ slug, token }: { slug: string; token: string }) {
  const [minTeas, setMinTeas] = useState(2)
  const { data, error, isPending } = useQuery({
    queryKey: ['analytics', slug],
    queryFn: () => api.analytics(slug, token),
    refetchInterval: 20_000,
  })

  if (isPending) return <p className="muted">Loading…</p>
  if (error) return <p className="error">{error.message}</p>
  if (data.rating_count === 0)
    return <div className="notice">Nothing to analyse yet. Rate a tea and come back.</div>

  const ingredients = data.ingredients.filter((i) => i.teas >= minTeas)
  const limit = Math.max(2, ...ingredients.map((i) => Math.abs(i.relative_all ?? 0)))

  return (
    <div className="analytics">
      <div className="stats">
        <div>
          <b>{data.tea_count}</b>
          <span className="label">Teas</span>
        </div>
        <div>
          <b>{data.rating_count}</b>
          <span className="label">Revealed ratings</span>
        </div>
        <div>
          <b>{data.taster_count}</b>
          <span className="label">Tasters</span>
        </div>
      </div>

      <p className="muted small">Only teas whose scores have been revealed are counted here.</p>

      <section className="stack-sm">
        <Heading kind="tea" level={3}>
          Ranking
        </Heading>
        <ol className="ranking">
          {data.ranking.map((r, i) => (
            <li key={r.tasting_id}>
              <span className="pos">{i + 1}</span>
              <span className="grow">
                <b className="with-icon">
                  <TeaBadge tea={r} size={20} />
                  {r.name}
                </b>
                <span className="muted small">
                  {r.rating_count} {r.rating_count === 1 ? 'rating' : 'ratings'}
                  {r.buy_again_yes > 0 && ` · ${r.buy_again_yes} would buy again`}
                </span>
                <Bar value={r.average_overall} />
              </span>
              <span className="score">{fmt(r.average_overall)}</span>
            </li>
          ))}
        </ol>
      </section>

      {data.anonymous ? (
        <div className="notice small">
          This room rates anonymously, so the per-person tables and “who agrees” are hidden.
        </div>
      ) : (
        <section className="stack-sm">
          <Heading kind="person" level={3}>
            Each taster
          </Heading>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Taster</th>
                  <th>Rated</th>
                  {SCORE_FIELDS.map((f) => (
                    <th key={f}>{f}</th>
                  ))}
                  <th aria-label="Notes" />
                </tr>
              </thead>
              <tbody>
                {data.people.map((p) => (
                  <tr key={p.participant.id}>
                    <td>
                      <span className="with-icon">
                        <ItemIcon name={p.participant.icon} colorFrom={p.participant.display_name} size={18} />
                        {p.participant.display_name}
                      </span>
                    </td>
                    <td>{p.rated}</td>
                    {SCORE_FIELDS.map((f) => (
                      <td key={f}>{fmt(p.average_by_field[f])}</td>
                    ))}
                    <td>
                      {p.rated > 0 && (
                        <Link
                          to={`/r/${slug}/notes?who=${p.participant.id}&print=1`}
                          className="table-link"
                          aria-label={`Notes by ${p.participant.display_name} as PDF`}
                        >
                          PDF
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Average score each person gives. A low average means a strict taster.</p>
        </section>
      )}

      <section className="stack-sm">
        <div className="row-between">
          <Heading kind="ingredient" level={3}>
            Ingredients
          </Heading>
          <label className="inline-select">
            <span className="muted small">In at least</span>
            <select value={minTeas} onChange={(e) => setMinTeas(Number(e.target.value))}>
              {MIN_TEA_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'tea' : 'teas'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted small">
          {data.anonymous
            ? "How teas with each ingredient scored compared with each taster's usual Overall score, averaged over everyone."
            : "How teas with each ingredient scored compared with each person's usual Overall score. +1.5 means those teas got 1.5 points more than that person's average."}
        </p>
        {ingredients.length === 0 ? (
          <div className="notice">No ingredient appears in {minTeas} rated teas yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="ingr-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Teas</th>
                  {data.people.map((p) => (
                    <th key={p.participant.id}>
                      <ItemIcon
                        name={p.participant.icon}
                        colorFrom={p.participant.display_name}
                        label={p.participant.display_name}
                      />
                    </th>
                  ))}
                  <th>All</th>
                  <th className="wide" />
                </tr>
              </thead>
              <tbody>
                {ingredients.map((i) => (
                  <tr key={i.ingredient}>
                    <td>{i.ingredient}</td>
                    <td>{i.teas}</td>
                    {data.people.map((p) => (
                      <td key={p.participant.id}>{signed(i.relative_by_person[p.participant.id])}</td>
                    ))}
                    <td className="strong">{signed(i.relative_all)}</td>
                    <td className="wide">
                      <Diverging value={i.relative_all} limit={limit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.agreement.some((a) => a.shared_teas > 0) && (
        <section className="stack-sm">
          <Heading kind="heart" level={3}>
            Who agrees
          </Heading>
          <ul className="agreement">
            {data.agreement
              .filter((a) => a.shared_teas > 0)
              .sort((x, y) => (x.mean_difference ?? 99) - (y.mean_difference ?? 99))
              .map((a) => (
                <li key={`${a.a.id}-${a.b.id}`}>
                  <span>
                    {a.a.display_name} & {a.b.display_name}
                  </span>
                  <span className="muted small">
                    {fmt(a.mean_difference)} points apart on average · {a.shared_teas} shared
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  )
}
