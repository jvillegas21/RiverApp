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
  floodStage: number | null
  ratePerHour: number | null // delta normalized to per-hour based on period
  hrsToFlood: number | null // if rising and below stage
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
      floodStage: null,
      ratePerHour: null,
      hrsToFlood: null,
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
    floodStage: null,
    ratePerHour: null,
    hrsToFlood: null,
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

  const readings = (json.value?.timeSeries ?? []).map(parseTimeSeries)

  // fetch flood stages and merge
  const stageMap = await fetchFloodStages(readings.map((r) => r.siteId))
  readings.forEach((r) => {
    r.floodStage = stageMap[r.siteId] ?? null
    if (r.delta !== null && periodDays > 0) {
      const hours = periodDays * 24
      r.ratePerHour = r.delta / hours
      if (r.floodStage !== null && r.gageHeight !== null && r.ratePerHour > 0) {
        const remaining = r.floodStage - r.gageHeight
        r.hrsToFlood = remaining > 0 ? remaining / r.ratePerHour : 0
      } else {
        r.hrsToFlood = null
      }
    }
  })

  return readings
}

async function fetchFloodStages(siteIds: string[]): Promise<Record<string, number>> {
  if (siteIds.length === 0) return {}
  const url = new URL('https://waterservices.usgs.gov/nwis/site/')
  url.searchParams.set('format', 'json')
  url.searchParams.set('siteOutput', 'expanded')
  url.searchParams.set('sites', siteIds.join(','))
  try {
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error('stage fetch HTTP ' + res.status)
    const json = (await res.json()) as any
    const out: Record<string, number> = {}
    json.value?.timeSeries?.forEach((ts: any) => {
      const site = ts.sourceInfo
      const props = site.siteProperty as any[] | undefined
      const flds = props?.find((p) => p.propertyCode === 'flds')
      if (flds) out[site.siteCode[0].value] = parseFloat(flds.propertyValue)
    })
    return out
  } catch (e) {
    console.error('flood stage fetch failed', e)
    return {}
  }
}