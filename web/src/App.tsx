import './App.css'
import { useCurrentPosition } from './hooks/useCurrentPosition'
import { MapView } from './components/MapView'

function App() {
  const { pos, error } = useCurrentPosition()

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
          <MapView center={pos} />
        </>
      )}
    </div>
  )
}

export default App
