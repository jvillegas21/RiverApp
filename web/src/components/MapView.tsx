import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Position } from '../hooks/useCurrentPosition'
import type { GaugeReading, GaugeTrend } from '../services/usgs'

interface MapViewProps {
  center: Position
  gauges?: GaugeReading[]
}

/**
 * MapView renders a Leaflet map centered at the provided coordinates with a marker.
 */
export function MapView({ center, gauges = [] }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const gaugeLayerRef = useRef<L.LayerGroup | null>(null)

  // initialize map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView(
        [center.lat, center.lon],
        13
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstance.current)

      markerRef.current = L.marker([center.lat, center.lon], {
        title: 'You are here',
      }).addTo(mapInstance.current)

      gaugeLayerRef.current = L.layerGroup().addTo(mapInstance.current)
    }
  }, [])

  // update position
  useEffect(() => {
    if (!mapInstance.current) return
    mapInstance.current.setView([center.lat, center.lon])
    if (markerRef.current) {
      markerRef.current.setLatLng([center.lat, center.lon])
    }
  }, [center])

  // update gauges layer
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
      marker.bindPopup(
        `<strong>${g.name}</strong><br/>Gage height: ${
          g.gageHeight !== null ? g.gageHeight.toFixed(2) + ' ' + g.unit : 'n/a'
        }<br/>Δ24h: ${g.delta !== null ? g.delta.toFixed(2) : 'n/a'} ${
          g.unit
        }<br/><small>${new Date(g.timestamp).toLocaleString()}</small>`
      )
      marker.addTo(gaugeLayerRef.current!)
    })
  }, [gauges])

  return <div ref={mapRef} style={{ height: '400px', width: '100%' }} />
}

function trendColor(trend: GaugeTrend): string {
  switch (trend) {
    case 'rising':
      return '#d73027' // red
    case 'falling':
      return '#4575b4' // blue
    case 'steady':
      return '#1a9850' // green
    default:
      return '#666'
  }
}