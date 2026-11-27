import { useState } from 'react'

import type { ShopInput } from '../lib/api'
import { COUNTRIES } from '../lib/countries'
import { ShopMap } from './ShopMap'

type Props = {
  initial?: ShopInput
  submitLabel: string
  pending: boolean
  error: string | null
  onSubmit: (shop: ShopInput) => void
}

const EMPTY: ShopInput = { name: '', country: '', city: '', address: '', website: '', latitude: null, longitude: null }

type Found = { lat: string; lon: string }

async function findOnMap(shop: ShopInput): Promise<Found | null> {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    q: [shop.address, shop.city].filter(Boolean).join(', '),
    countrycodes: shop.country.toLowerCase(),
  })
  // Nominatim is OpenStreetMap's free address search. It allows about one search a second, which
  // a person pressing a button never comes near.
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!res.ok) throw new Error('The address search is not answering. Tap the map instead.')
  const found: Found[] = await res.json()
  return found[0] ?? null
}

export function ShopForm({ initial, submitLabel, pending, error, onSubmit }: Props) {
  const [shop, setShop] = useState<ShopInput>(() => {
    const { name, country, city, address, website, latitude, longitude } = initial ?? EMPTY
    return { name, country, city, address, website, latitude, longitude }
  })
  const [searching, setSearching] = useState(false)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)
  const set = (changes: Partial<ShopInput>) => setShop((s) => ({ ...s, ...changes }))
  const located = shop.latitude !== null && shop.longitude !== null

  const search = async () => {
    setSearching(true)
    setSearchMessage(null)
    try {
      const found = await findOnMap(shop)
      if (found) set({ latitude: Number(found.lat), longitude: Number(found.lon) })
      else setSearchMessage("Couldn't find that address. Tap the map where the shop is instead.")
    } catch (e) {
      setSearchMessage((e as Error).message)
    } finally {
      setSearching(false)
    }
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(shop)
      }}
    >
      <label className="field" htmlFor="shop-name">
        <span className="label">Name</span>
        <input id="shop-name" required maxLength={120} value={shop.name} onChange={(e) => set({ name: e.target.value })} placeholder="Czajownia" />
      </label>
      <label className="field" htmlFor="shop-country">
        <span className="label">Country</span>
        <select id="shop-country" required value={shop.country} onChange={(e) => set({ country: e.target.value })}>
          <option value="" disabled>
            Pick a country
          </option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field" htmlFor="shop-city">
        <span className="label">City</span>
        <input id="shop-city" required maxLength={80} value={shop.city} onChange={(e) => set({ city: e.target.value })} placeholder="Kraków" />
      </label>
      <label className="field" htmlFor="shop-address">
        <span className="label">Address</span>
        <input id="shop-address" maxLength={200} value={shop.address} onChange={(e) => set({ address: e.target.value })} placeholder="ul. Józefa 1" />
      </label>
      <label className="field" htmlFor="shop-website">
        <span className="label">Website</span>
        <input id="shop-website" maxLength={300} inputMode="url" value={shop.website} onChange={(e) => set({ website: e.target.value })} placeholder="czajownia.pl" />
      </label>
      <div className="field">
        <div className="row-between">
          <span className="label">Location</span>
          <span className="actions">
            <button type="button" className="ghost small" disabled={searching || !shop.city || !shop.country} onClick={search}>
              {searching ? 'Searching…' : 'Find address on map'}
            </button>
            {located && (
              <button type="button" className="ghost small" onClick={() => set({ latitude: null, longitude: null })}>
                Clear
              </button>
            )}
          </span>
        </div>
        <ShopMap
          height={240}
          pins={located ? [{ id: 'new', lat: shop.latitude!, lng: shop.longitude!, label: shop.name || 'Shop' }] : []}
          onPick={(p) => set({ latitude: Number(p.lat.toFixed(6)), longitude: Number(p.lng.toFixed(6)) })}
        />
        <small className="muted">
          {searchMessage ?? (located ? 'Tap the map to move the pin.' : 'Find the address, or tap the map where the shop is.')}
        </small>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
