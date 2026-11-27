import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Explain } from '../components/Explain'
import { KindIcon } from '../components/KindIcon'
import { Sheet } from '../components/Sheet'
import { ShopForm } from '../components/ShopForm'
import { ShopMap } from '../components/ShopMap'
import { api, type ShopInput, type ShopSummary } from '../lib/api'
import { countryName, flag } from '../lib/countries'
import { fmt } from '../lib/format'
import { catalogToken } from '../lib/sessions'

export function ShopsPage() {
  const token = catalogToken()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('')
  const [adding, setAdding] = useState(false)
  const { data, error, isPending } = useQuery({
    queryKey: ['shops'],
    queryFn: () => api.shops(token!),
    enabled: token !== null,
  })
  const add = useMutation({
    mutationFn: (body: ShopInput) => api.addShop(token!, body),
    onSuccess: (shop) => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      navigate(`/shops/${shop.id}`)
    },
  })

  if (!token)
    return (
      <main className="wrap narrow">
        <div className="panel empty">
          <h2>Tea shops</h2>
          <p className="muted center">Join or create a room first, then you can add and review tea shops.</p>
          <Link to="/" className="primary">
            Go to rooms
          </Link>
        </div>
      </main>
    )

  const shops = data ?? []
  const countries = [...new Set(shops.map((s) => s.country))].sort((a, b) => countryName(a).localeCompare(countryName(b)))
  const query = search.trim().toLowerCase()
  const shown = shops.filter(
    (s) =>
      (!country || s.country === country) &&
      (!query || [s.name, s.city, s.address].some((v) => v.toLowerCase().includes(query))),
  )

  return (
    <main className="wrap">
      <header className="room-head">
        <Link to="/" className="back-link">
          ‹ My rooms
        </Link>
        <div className="room-title">
          <span className="brand">
            <KindIcon kind="shop" size={22} />
          </span>
          <div className="grow">
            <h1>Tea shops</h1>
            <span className="muted small">Places to buy tea, scored by everyone in the app.</span>
          </div>
          <button
            className="primary small"
            onClick={() => {
              add.reset()
              setAdding(true)
            }}
          >
            + Add shop
          </button>
        </div>
      </header>

      <ShopMap
        pins={shown.flatMap((s) =>
          s.latitude !== null && s.longitude !== null ? [{ id: s.id, lat: s.latitude, lng: s.longitude, label: s.name }] : [],
        )}
        onOpen={(id) => navigate(`/shops/${id}`)}
      />

      <div className="shop-filters">
        <input type="search" placeholder="Search name, city or address" aria-label="Search shops" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Country" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {flag(c)} {countryName(c)}
            </option>
          ))}
        </select>
      </div>

      {isPending ? (
        <p className="muted">Loading…</p>
      ) : error ? (
        <p className="error">{error.message}</p>
      ) : shown.length === 0 ? (
        <div className="notice">{shops.length === 0 ? 'No shops yet. Add the first one.' : 'No shop matches.'}</div>
      ) : (
        <ShopGroups shops={shown} />
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} eyebrow="Tea shops" title="Add a shop">
        {adding && <ShopForm submitLabel="Add shop" pending={add.isPending} error={add.error?.message ?? null} onSubmit={(body) => add.mutate(body)} />}
      </Sheet>
    </main>
  )
}

function ShopGroups({ shops }: { shops: ShopSummary[] }) {
  const groups = new Map<string, ShopSummary[]>()
  for (const shop of [...shops].sort(
    (a, b) => countryName(a.country).localeCompare(countryName(b.country)) || a.city.localeCompare(b.city),
  )) {
    const key = `${shop.country}|${shop.city}`
    groups.set(key, [...(groups.get(key) ?? []), shop])
  }
  return (
    <div className="stack">
      {[...groups.entries()].map(([key, rows]) => (
        <section key={key} className="stack-sm">
          <h3 className="shop-place">
            {flag(rows[0].country)} {rows[0].city}, {countryName(rows[0].country)}
          </h3>
          <ul className="tea-list">
            {rows.map((shop) => (
              <li key={shop.id}>
                <Link to={`/shops/${shop.id}`} className="tea-row">
                  <span className="tea-main">
                    <span className="tea-name">{shop.name}</span>
                    <span className="tea-sub">
                      {shop.address || 'No address'}
                      {shop.comment_count > 0 && ` · ${shop.comment_count} ${shop.comment_count === 1 ? 'comment' : 'comments'}`}
                    </span>
                  </span>
                  <span className="shop-score">
                    <Explain
                      title="Average score"
                      text={
                        shop.score_count === 0
                          ? 'Nobody has scored this shop yet.'
                          : `The average of ${shop.score_count} ${shop.score_count === 1 ? "person's score" : "people's scores"} for this shop, from 0 to 10.`
                      }
                    >
                      {fmt(shop.average_score)}
                    </Explain>
                    <small className="muted">
                      {shop.score_count} {shop.score_count === 1 ? 'score' : 'scores'}
                    </small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
