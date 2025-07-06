import './App.css'
import { useCurrentPosition } from './hooks/useCurrentPosition'
import { MapView } from './components/MapView'
import { useEffect, useState } from 'react'
import { getNearbyGaugeReadings } from './services/usgs'
import type { GaugeReading } from './services/usgs'
import { useInterval } from './hooks/useInterval'

function App() {
  const { pos, error } = useCurrentPosition()
  const [gauges, setGauges] = useState<GaugeReading[] | null>(null)
  const [loadingGauges, setLoadingGauges] = useState(false)
  const [gaugeError, setGaugeError] = useState<string | null>(null)
  // Keep simple in-memory history per gauge id (last 12 samples)
  const [history, setHistory] = useState<Record<string, GaugeReading[]>>({})

  // fetch gauges when position available
  useEffect(() => {
    if (!pos) return
    setLoadingGauges(true)
    getNearbyGaugeReadings(pos.lat, pos.lon)
      .then((list) => {
        setGauges(list)
        setGaugeError(null)
      })
      .catch((e) => {
        console.error(e)
        setGaugeError(e instanceof Error ? e.message : String(e))
        setGauges([])
      })
      .finally(() => setLoadingGauges(false))
  }, [pos])

  // Poll every 5 minutes (300_000 ms)
  useInterval(() => {
    if (!pos) return
    getNearbyGaugeReadings(pos.lat, pos.lon)
      .then((list) => {
        // update gauges state and history
        setGauges(list)
        setHistory((prev) => {
          const next: Record<string, GaugeReading[]> = { ...prev }
          list.forEach((g) => {
            const arr = next[g.siteId] ?? []
            arr.push(g)
            if (arr.length > 12) arr.shift()
            next[g.siteId] = arr
          })
          return next
        })

        // simple alert logic – rising more than 0.3 units since previous sample
        list.forEach((g) => {
          const prev = history[g.siteId]?.[history[g.siteId].length - 1]
          if (prev && g.gageHeight !== null && prev.gageHeight !== null) {
            const diff = g.gageHeight - prev.gageHeight
            if (diff > 0.3) {
              // eslint-disable-next-line no-alert
              alert(
                `${g.name} is rising quickly (+${diff.toFixed(2)} ${g.unit}). Stay alert.`
              )
            }
          }
        })
      })
      .catch((err) => console.error('poll error', err))
  }, 300_000)

  return (
    <div className="App">
      <h1>Flood Alert – Prototype</h1>
      {error && <p>Error obtaining location: {error}</p>}
      {!error && !pos && <p>Obtaining your geolocation…</p>}
      {pos && (
        <>
          <p>
            Your position: {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}
          </p>
          {loadingGauges && <p>Loading nearby gauges…</p>}
          {gaugeError && <p style={{ color: 'red' }}>Gauge error: {gaugeError}</p>}
          {gauges && gauges.length > 0 && (
            <p>
              Found {gauges.length} gauge{gauges.length !== 1 ? 's' : ''} within
              25 km.
            </p>
          )}
          {gauges && gauges.length === 0 && !loadingGauges && !gaugeError && (
            <p>No gauges found within 25 km. Try increasing the search radius.</p>
          )}
          <MapView center={pos} gauges={gauges ?? []} />
        </>
      )}
    </div>
  )
}

export default App
