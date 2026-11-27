import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import { useEffect, useRef } from 'react'

export type Pin = { id: string; lat: number; lng: number; label: string }
type Point = { lat: number; lng: number }

type Props = {
  pins: Pin[]
  onOpen?: (id: string) => void
  // Turns the map into a picker: tapping it moves the single pin there.
  onPick?: (point: Point) => void
  height?: number
}

const WORLD: L.LatLngTuple = [30, 10]

const pinStyle: L.CircleMarkerOptions = {
  radius: 8,
  weight: 2,
  color: '#fff',
  fillColor: '#2f7d4f',
  fillOpacity: 1,
}

export function ShopMap({ pins, onOpen, onPick, height = 320 }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const handlers = useRef({ onOpen, onPick })
  handlers.current = { onOpen, onPick }

  useEffect(() => {
    if (!box.current) return
    const m = L.map(box.current, { scrollWheelZoom: false, worldCopyJump: true }).setView(WORLD, 2)
    // OpenStreetMap's own tiles are free for light use like this, as long as the credit stays visible.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    m.on('click', (e) => handlers.current.onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }))
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  const key = pins.map((p) => `${p.id}:${p.lat}:${p.lng}`).join('|')
  useEffect(() => {
    const m = map.current
    const group = layer.current
    if (!m || !group) return
    group.clearLayers()
    for (const pin of pins) {
      const marker = L.circleMarker([pin.lat, pin.lng], pinStyle).bindTooltip(pin.label)
      if (handlers.current.onOpen) marker.on('click', () => handlers.current.onOpen?.(pin.id))
      marker.addTo(group)
    }
    if (pins.length === 1) m.setView([pins[0].lat, pins[0].lng], Math.max(m.getZoom(), 15))
    else if (pins.length > 1) m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [30, 30], maxZoom: 14 })
  }, [key])

  return <div ref={box} className={`shop-map${onPick ? ' picking' : ''}`} style={{ height }} />
}
