import { useEffect, useState } from 'react'

export interface Position {
  lat: number
  lon: number
}

interface UseCurrentPositionResult {
  pos: Position | null
  error: string | null
}

/**
 * useCurrentPosition – React hook that continuously watches the user's
 * geolocation and returns the latest latitude/longitude pair.
 */
export function useCurrentPosition(): UseCurrentPositionResult {
  const [pos, setPos] = useState<Position | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser')
      return
    }

    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return { pos, error }
}