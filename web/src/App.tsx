import './App.css'
import { useCurrentPosition } from './hooks/useCurrentPosition'
import { MapView } from './components/MapView'
import { TrendSparkline } from './components/TrendSparkline'
import { useEffect, useState, useRef } from 'react'
import { getNearbyGaugeReadings } from './services/usgs'
import type { GaugeReading } from './services/usgs'
import { useInterval } from './hooks/useInterval'

function App() {
  const { pos, error } = useCurrentPosition()
  const [gauges, setGauges] = useState<GaugeReading[] | null>(null)
  const [loadingGauges, setLoadingGauges] = useState(false)
  const [gaugeError, setGaugeError] = useState<string | null>(null)
  // Keep in-memory history per gauge id
  const [history, setHistory] = useState<Record<string, GaugeReading[]>>({})

  // Configurable polling interval (minutes) & alert threshold (units)
  const [pollMinutes, setPollMinutes] = useState(5)
  const [alertThreshold, setAlertThreshold] = useState(0.3)

  // Track last alert timestamp per gauge to avoid spam (ms epoch)
  const lastAlertRef = useRef<Record<string, number>>({})

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

  // Poll with configurable interval
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
            if (diff > alertThreshold) {
              const now = Date.now()
              const last = lastAlertRef.current[g.siteId] ?? 0
              if (now - last > pollMinutes * 60_000) {
                lastAlertRef.current[g.siteId] = now
                const msg = `${g.name} rising +${diff.toFixed(2)} ${g.unit}`
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Flood Alert', { body: msg })
                } else {
                  // eslint-disable-next-line no-alert
                  alert(msg)
                }
              }
            }
          }
        })
      })
      .catch((err) => console.error('poll error', err))
  }, pollMinutes * 60_000)

  // Ask notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

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
          {/* Config panel */}
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Poll every{' '}
              <input
                type="number"
                min={1}
                max={60}
                value={pollMinutes}
                onChange={(e) => setPollMinutes(Number(e.target.value) || 1)}
                style={{ width: '4rem' }}
              />{' '}
              minutes
            </label>{' '}
            <label style={{ marginLeft: '1rem' }}>
              Alert threshold{' '}
              <input
                type="number"
                step={0.1}
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                style={{ width: '4rem' }}
              />{' '}
              units
            </label>
          </div>

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

          {/* List with trends */}
          {gauges && gauges.length > 0 && (
            <table className="gauges" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Current</th>
                  <th>Δ</th>
                  <th>Trend</th>
                  <th>History</th>
                </tr>
              </thead>
              <tbody>
                {gauges.map((g) => (
                  <tr key={g.siteId}>
                    <td>{g.name}</td>
                    <td>
                      {g.gageHeight !== null ? g.gageHeight.toFixed(2) : 'n/a'}{' '}
                      {g.unit}
                    </td>
                    <td>
                      {g.delta !== null ? g.delta.toFixed(2) : 'n/a'} {g.unit}
                    </td>
                    <td>{g.trend}</td>
                    <td>
                      {history[g.siteId] && history[g.siteId].length > 1 ? (
                        <TrendSparkline
                          data={history[g.siteId]}
                          color={g.trend === 'rising' ? '#d73027' : g.trend === 'falling' ? '#4575b4' : '#1a9850'}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}

export default App
