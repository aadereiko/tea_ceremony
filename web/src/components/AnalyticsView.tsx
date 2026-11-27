import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { api, SCORE_FIELDS } from '../lib/api'
import { fmt, signed } from '../lib/format'
import { Explain } from './Explain'
import { Heading } from './KindIcon'
import { ItemIcon } from './ItemIcon'
import { TeaBadge } from './TeaBadge'

// The chart library is only needed here, so it downloads when someone opens Analytics.
const TasteMap = lazy(() => import('./Charts').then((m) => ({ default: m.TasteMap })))
const Drivers = lazy(() => import('./Charts').then((m) => ({ default: m.Drivers })))

const MIN_TEA_OPTIONS = [1, 2, 3, 4]

const TABS = [
  { key: 'ranking', label: 'Ranking' },
  { key: 'tasters', label: 'Tasters' },
  { key: 'ingredients', label: 'Ingredients' },
] as const
type Tab = (typeof TABS)[number]['key']

const FIELD_MEANING: Record<string, string> = {
  smell: 'how much they liked the aroma',
  taste: 'how much they enjoyed the flavour',
  finish: 'how pleasant the aftertaste was',
  overall: 'their total verdict',
}

const points = (n: number) => `${fmt(Math.abs(n))} ${Math.abs(n) === 1 ? 'point' : 'points'}`

function relativeText(value: number | null, who: string, ingredient: string) {
  if (value == null) return `${who} hasn't rated a revealed tea with ${ingredient} yet.`
  if (Math.abs(value) < 0.05) return `${who} scored teas with ${ingredient} exactly as usual.`
  return `${who} scored teas with ${ingredient} ${points(value)} ${value > 0 ? 'above' : 'below'} their own usual Overall score.`
}

function agreementText(gap: number | null) {
  if (gap == null) return 'No tea scored by both yet.'
  if (gap <= 1) return 'Very similar taste.'
  if (gap <= 2.5) return 'Fairly similar taste.'
  return 'Quite different taste.'
}

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
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = TABS.find((t) => t.key === searchParams.get('tab'))?.key ?? 'ranking'
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
          <Explain title="Teas" text="All teas in this room, including ones whose scores are still hidden.">
            <b>{data.tea_count}</b>
          </Explain>
          <span className="label">Teas</span>
        </div>
        <div>
          <Explain
            title="Revealed ratings"
            text="Scores everyone can see. Analytics only uses these, so hidden scores can't leak through averages."
          >
            <b>{data.rating_count}</b>
          </Explain>
          <span className="label">Revealed ratings</span>
        </div>
        <div>
          <Explain title="Tasters" text="People who have at least one revealed rating.">
            <b>{data.taster_count}</b>
          </Explain>
          <span className="label">Tasters</span>
        </div>
      </div>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className="tab"
            onClick={() => setSearchParams(t.key === 'ranking' ? {} : { tab: t.key }, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'ranking' && (
        <>
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
                      {r.rating_count} {r.rating_count === 1 ? 'rating' : 'ratings'}, average{' '}
                      <Explain
                        title="Plain average"
                        text={`The simple average of the ${r.rating_count} Overall ${r.rating_count === 1 ? 'score' : 'scores'} for this tea, before the fair-score adjustment.`}
                      >
                        {fmt(r.average_overall)}
                      </Explain>
                      {r.buy_again_yes > 0 && (
                        <>
                          {' · '}
                          <Explain title="Would buy again" text={`${r.buy_again_yes} of ${r.rating_count} tasters said yes to "Would buy again".`}>
                            {r.buy_again_yes} would buy again
                          </Explain>
                        </>
                      )}
                    </span>
                    <Bar value={r.fair_score} />
                  </span>
                  <Explain
                    className="score"
                    title={`Fair score ${fmt(r.fair_score)}`}
                    text={`The tea's ${r.rating_count} ${r.rating_count === 1 ? 'score' : 'scores'} plus ${data.prior_votes} pretend votes at the room average (${fmt(data.room_average)}), averaged. The teas are sorted by this, so one lucky 10 can't beat several 9s.`}
                  >
                    {fmt(r.fair_score)}
                  </Explain>
                </li>
              ))}
            </ol>
            <p className="muted small">
              Ranked by a fair score: every tea counts as if it also had {data.prior_votes} extra votes at the room's
              average ({fmt(data.room_average)}). One 10 can't beat several 9s, and the more people rate a tea, the
              closer its fair score gets to its plain average. <Link to="/docs/analytics#fair-ranking">How it works</Link>
            </p>
          </section>

          <section className="stack-sm">
            <Heading kind="chart" level={3}>
              Taste map
            </Heading>
            <p className="muted small">
              Each dot is a tea, in its brew colour. Further right means a better fair score. Higher up means the
              tasters disagreed more. Hover or tap a dot to see what it means.{' '}
              <Link to="/docs/analytics#taste-map">How it works</Link>
            </p>
            <Suspense fallback={<p className="muted small">Loading the chart…</p>}>
              <TasteMap ranking={data.ranking} />
            </Suspense>
          </section>
        </>
      )}

      {tab === 'tasters' && (
        <>
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
                      <th>
                        <Explain title="Rated" text="How many revealed teas this person scored.">
                          Rated
                        </Explain>
                      </th>
                      {SCORE_FIELDS.map((f) => (
                        <th key={f}>
                          <Explain title={`Average ${f}`} text={`The average ${f} score each person gave: ${FIELD_MEANING[f]}, from 0 to 10.`}>
                            {f}
                          </Explain>
                        </th>
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
                          <td key={f}>
                            {p.average_by_field[f] == null ? (
                              '–'
                            ) : (
                              <Explain
                                title={`${p.participant.display_name}'s average ${f}`}
                                text={`Over ${p.rated} ${p.rated === 1 ? 'tea' : 'teas'}. Higher than the others means a more generous ${f} scorer.`}
                              >
                                {fmt(p.average_by_field[f])}
                              </Explain>
                            )}
                          </td>
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
            <Heading kind="chart" level={3}>
              What drives Overall
            </Heading>
            <p className="muted small">
              How closely each score moves together with Overall, from −1 to 1. Near 1 means it's what that person
              cares about most. Needs at least {data.min_driver_teas} rated teas. Hover or tap a bar for details.{' '}
              <Link to="/docs/analytics#what-drives-overall">How it works</Link>
            </p>
            <Suspense fallback={<p className="muted small">Loading the chart…</p>}>
              <Drivers drivers={data.drivers} minTeas={data.min_driver_teas} />
            </Suspense>
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
                        <Explain
                          title={`${fmt(a.mean_difference)} points apart`}
                          text={`On the ${a.shared_teas} ${a.shared_teas === 1 ? 'tea' : 'teas'} both scored, their Overall scores differ by this much on average. ${agreementText(a.mean_difference)}`}
                        >
                          {fmt(a.mean_difference)} points apart
                        </Explain>{' '}
                        on average · {a.shared_teas} shared
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </>
      )}

      {tab === 'ingredients' && (
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
                    <th>
                      <Explain title="Teas" text="How many revealed teas contain this ingredient.">
                        Teas
                      </Explain>
                    </th>
                    {data.people.map((p) => (
                      <th key={p.participant.id}>
                        <ItemIcon
                          name={p.participant.icon}
                          colorFrom={p.participant.display_name}
                          label={p.participant.display_name}
                        />
                      </th>
                    ))}
                    <th>
                      <Explain title="All" text="Everyone's differences from their own usual score, averaged together.">
                        All
                      </Explain>
                    </th>
                    <th className="wide" />
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((i) => (
                    <tr key={i.ingredient}>
                      <td>{i.ingredient}</td>
                      <td>{i.teas}</td>
                      {data.people.map((p) => (
                        <td key={p.participant.id}>
                          <Explain
                            title={`${p.participant.display_name} and ${i.ingredient}`}
                            text={relativeText(i.relative_by_person[p.participant.id] ?? null, p.participant.display_name, i.ingredient)}
                          >
                            {signed(i.relative_by_person[p.participant.id])}
                          </Explain>
                        </td>
                      ))}
                      <td className="strong">
                        <Explain title={`Everyone and ${i.ingredient}`} text={relativeText(i.relative_all, 'On average, the group', i.ingredient)}>
                          {signed(i.relative_all)}
                        </Explain>
                      </td>
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
      )}
    </div>
  )
}
