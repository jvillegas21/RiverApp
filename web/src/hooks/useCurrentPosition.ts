import { useState, useEffect } from 'react'

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
      setError('Geolocation is not supported by this browser')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lon: p.coords.longitude })
      },
      (err) => {
        setError(err.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000, // cache for 10 s
        timeout: 10_000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return { pos, error }
}