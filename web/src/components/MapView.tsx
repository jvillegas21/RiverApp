import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Position } from '../hooks/useCurrentPosition'

interface MapViewProps {
  center: Position
}

/**
 * MapView renders a Leaflet map centered at the provided coordinates with a marker.
 */
export function MapView({ center }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

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

      markerRef.current = L.marker([center.lat, center.lon]).addTo(
        mapInstance.current
      )
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

  return <div ref={mapRef} style={{ height: '400px', width: '100%' }} />
}