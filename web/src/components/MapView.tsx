import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Position } from '../hooks/useCurrentPosition'
import type { GaugeReading, GaugeTrend } from '../services/usgs'

interface Props {
  center: Position
  gauges: GaugeReading[]
}

/**
 * MapView renders a Leaflet map centered at the provided coordinates with a marker.
 */
export function MapView({ center, gauges }: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const gaugeLayerRef = useRef<L.LayerGroup | null>(null)

  // initialise map once
  useEffect(() => {
    if (!divRef.current || mapRef.current) return

    mapRef.current = L.map(divRef.current).setView([center.lat, center.lon], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current)

    userMarkerRef.current = L.marker([center.lat, center.lon], {
      title: 'Your location',
    }).addTo(mapRef.current)

    gaugeLayerRef.current = L.layerGroup().addTo(mapRef.current)
  }, [])

  // update user position
  useEffect(() => {
    if (!mapRef.current || !userMarkerRef.current) return
    userMarkerRef.current.setLatLng([center.lat, center.lon])
    mapRef.current.setView([center.lat, center.lon])
  }, [center])

  // update gauges
  useEffect(() => {
    if (!gaugeLayerRef.current) return
    gaugeLayerRef.current.clearLayers()

    gauges.forEach((g) => {
      const color = trendColor(g.trend)
      const marker = L.circleMarker([g.lat, g.lon], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(
          `<strong>${g.name}</strong><br/>Gage height: ${
            g.gageHeight !== null ? g.gageHeight.toFixed(2) + ' ' + g.unit : 'n/a'
          }<br/>Δ: ${g.delta !== null ? g.delta.toFixed(2) : 'n/a'} ${
            g.unit
          }<br/><small>${new Date(g.timestamp).toLocaleString()}</small>`
        )
      marker.addTo(gaugeLayerRef.current!)
    })
  }, [gauges])

  return <div ref={divRef} style={{ height: '400px', width: '100%' }} />
}

function trendColor(t: GaugeTrend) {
  switch (t) {
    case 'rising':
      return '#d73027'
    case 'falling':
      return '#4575b4'
    case 'steady':
      return '#1a9850'
    default:
      return '#666'
  }
}