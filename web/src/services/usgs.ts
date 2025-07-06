/**
 * USGS Water Services helper functions.
 * Docs: https://waterservices.usgs.gov/
 */

export type GaugeTrend = 'rising' | 'falling' | 'steady' | 'unknown'

export interface GaugeReading {
  siteId: string
  name: string
  lat: number
  lon: number
  gageHeight: number | null // latest value
  unit: string
  timestamp: string
  delta: number | null // change over the period (latest - earliest)
  trend: GaugeTrend
}

/**
 * Create a bounding box for a given center and radius (in km).
 * Good approximation for small radii (<100 km).
 */
export function toBBox(
  lat: number,
  lon: number,
  km: number
): [number, number, number, number] {
  const dLat = km / 110.574 // º per km
  const dLon = km / (111.32 * Math.cos((lat * Math.PI) / 180))
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat]
}

// Minimal typings that cover the parts of the USGS Instantaneous Values
// response we actually consume. Full OpenAPI description is available at
// https://waterservices.usgs.gov/docs/ but is far larger than we need.

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
// USGS API helpers
// ---------------------------------------------------------------------------

const TREND_EPSILON = 0.05 // ignore changes smaller than this

/**
 * Classify a water-level change into a qualitative trend.
 */
export function classifyTrend(delta: number | null): GaugeTrend {
  if (delta === null) return 'unknown'
  if (Math.abs(delta) < TREND_EPSILON) return 'steady'
  return delta > 0 ? 'rising' : 'falling'
}

/**
 * Build the USGS Instantaneous Values request URL.
 */
function buildInstantValueUrl(params: {
  bbox: [number, number, number, number]
  parameterCd: string
  period: string
  siteType: string
}): string {
  const url = new URL('https://waterservices.usgs.gov/nwis/iv/')
  url.searchParams.set('format', 'json')
  url.searchParams.set('parameterCd', params.parameterCd)
  url.searchParams.set('bBox', params.bbox.join(','))
  url.searchParams.set('siteType', params.siteType)
  url.searchParams.set('period', params.period)
  return url.toString()
}

/**
 * Fetch nearby stream gauges (siteType=ST) and their last gage-height reading (00065).
 *
 * @param lat – latitude in decimal degrees
 * @param lon – longitude in decimal degrees
 * @param radiusKm – search radius, default 25 km
 * @param periodDays – period in days, default 1 day
 */
export async function getNearbyGaugeReadings(
  lat: number,
  lon: number,
  radiusKm = 25,
  periodDays = 1
): Promise<GaugeReading[]> {
  const bbox = toBBox(lat, lon, radiusKm)
  const periodStr = `P${periodDays}D`
  const url = buildInstantValueUrl({
    bbox,
    parameterCd: '00065', // gage height
    period: periodStr,
    siteType: 'ST',
  })

  let data: USGSInstantResponse
  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`USGS request failed: HTTP ${res.status}`)
    }
    data = (await res.json()) as USGSInstantResponse
  } catch (err) {
    console.error('USGS fetch failed', err)
    throw err instanceof Error ? err : new Error('Unknown USGS error')
  }

  const tsArray = data.value?.timeSeries ?? []

  return tsArray.map(parseTimeSeries)
}

/**
 * Convert a USGS TimeSeries object into our GaugeReading DTO.
 */
function parseTimeSeries(ts: USGSTimeSeries): GaugeReading {
  const site = ts.sourceInfo
  const valueArr = ts.values?.[0]?.value as USGSValue[] | undefined

  if (!valueArr || valueArr.length === 0) {
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

  const latest = valueArr[valueArr.length - 1]
  const earliest = valueArr[0]
  const latestNum = parseFloat(latest.value)
  const earliestNum = parseFloat(earliest.value)
  const delta = latestNum - earliestNum

  const trend = classifyTrend(delta)

  return {
    siteId: site.siteCode[0].value,
    name: site.siteName,
    lat: site.geoLocation.geogLocation.latitude,
    lon: site.geoLocation.geogLocation.longitude,
    gageHeight: latestNum,
    unit: ts.variable.unit.unitCode,
    timestamp: latest.dateTime,
    delta,
    trend,
  }
}