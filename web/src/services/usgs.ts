/**
 * USGS Water Services API helper.
 * Docs: https://waterservices.usgs.gov/
 */

// ---------------------------------------------------------------------------
// Public DTOs
// ---------------------------------------------------------------------------

export type GaugeTrend = 'rising' | 'falling' | 'steady' | 'unknown'

export interface GaugeReading {
  siteId: string
  name: string
  lat: number
  lon: number
  gageHeight: number | null // latest value
  unit: string
  timestamp: string
  delta: number | null // change over the sampled period
  trend: GaugeTrend
}

// ---------------------------------------------------------------------------
// Internal USGS response typings – only the subset we consume.
// ---------------------------------------------------------------------------

interface USGSGeoLocation {
  geoLocation: {
    geogLocation: {
      latitude: number
      longitude: number
    }
  }
}

interface USGSSourceInfo extends USGSGeoLocation {
  siteCode: Array<{ value: string }>
  siteName: string
}

interface USGSVariable {
  variableCode: Array<{ value: string }>
  unit: { unitCode: string }
}

interface USGSValue {
  value: string
  dateTime: string
}

interface USGSTimeSeries {
  sourceInfo: USGSSourceInfo
  variable: USGSVariable
  values: Array<{ value: USGSValue[] }>
}

interface USGSInstantResponse {
  value: {
    timeSeries: USGSTimeSeries[]
  }
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/** Convert lat/lon + radius (km) into a bounding-box. Approximation ok <100 km. */
export function toBBox(
  lat: number,
  lon: number,
  km: number
): [number, number, number, number] {
  const dLat = km / 110.574
  const dLon = km / (111.32 * Math.cos((lat * Math.PI) / 180))
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat]
}

/** Classification dead-band */
const EPS = 0.05
export function classifyTrend(delta: number | null): GaugeTrend {
  if (delta === null) return 'unknown'
  if (Math.abs(delta) < EPS) return 'steady'
  return delta > 0 ? 'rising' : 'falling'
}

function buildInstantUrl(bbox: [number, number, number, number], period: string) {
  const url = new URL('https://waterservices.usgs.gov/nwis/iv/')
  url.searchParams.set('format', 'json')
  url.searchParams.set('parameterCd', '00065') // gage height
  url.searchParams.set('siteType', 'ST')
  url.searchParams.set('bBox', bbox.join(','))
  url.searchParams.set('period', period) // e.g. P1D
  return url.toString()
}

function parseTimeSeries(ts: USGSTimeSeries): GaugeReading {
  const site = ts.sourceInfo
  const values = ts.values?.[0]?.value ?? []

  if (values.length === 0) {
    return {
      siteId: site.siteCode[0].value,
      name: site.siteName,
      lat: site.geoLocation.geogLocation.latitude,
      lon: site.geoLocation.geogLocation.longitude,
      gageHeight: null,
      unit: ts.variable.unit.unitCode,
      timestamp: '',
      delta: null,
      trend: 'unknown',
    }
  }

  const earliest = values[0]
  const latest = values[values.length - 1]
  const earliestNum = parseFloat(earliest.value)
  const latestNum = parseFloat(latest.value)
  const delta = latestNum - earliestNum

  return {
    siteId: site.siteCode[0].value,
    name: site.siteName,
    lat: site.geoLocation.geogLocation.latitude,
    lon: site.geoLocation.geogLocation.longitude,
    gageHeight: latestNum,
    unit: ts.variable.unit.unitCode,
    timestamp: latest.dateTime,
    delta,
    trend: classifyTrend(delta),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch nearby USGS gauges and compute water-level trend.
 * @param lat center latitude
 * @param lon center longitude
 * @param radiusKm search radius in km (default 25)
 * @param periodDays time window to compute trend (default 1 day)
 */
export async function getNearbyGaugeReadings(
  lat: number,
  lon: number,
  radiusKm = 25,
  periodDays = 1
): Promise<GaugeReading[]> {
  const bbox = toBBox(lat, lon, radiusKm)
  const url = buildInstantUrl(bbox, `P${periodDays}D`)

  let json: USGSInstantResponse
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`)
    json = (await res.json()) as USGSInstantResponse
  } catch (err) {
    console.error('USGS fetch failed', err)
    throw err instanceof Error ? err : new Error('Unknown USGS error')
  }

  return (json.value?.timeSeries ?? []).map(parseTimeSeries)
}