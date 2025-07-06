import './App.css'
import { useCurrentPosition } from './hooks/useCurrentPosition'
import { MapView } from './components/MapView'
import { useEffect, useState } from 'react'
import { getNearbyGaugeReadings } from './services/usgs'
import type { GaugeReading } from './services/usgs'

function App() {
  const { pos, error } = useCurrentPosition()
  const [gauges, setGauges] = useState<GaugeReading[] | null>(null)
  const [loadingGauges, setLoadingGauges] = useState(false)
  const [gaugeError, setGaugeError] = useState<string | null>(null)

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
