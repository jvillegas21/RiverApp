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
 * Convert a point and radius (in km) to a latitude/longitude bounding box.
 * Note: good enough for small radii (< ~100 km).
 */
function toBBox(lat: number, lon: number, km: number): [number, number, number, number] {
  const dLat = km / 110.574
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

/**
 * Fetch nearby stream gauges (siteType=ST) and their last gage-height reading (00065).
 *
 * @param lat – latitude in decimal degrees
 * @param lon – longitude in decimal degrees
 * @param radiusKm – search radius, default 25 km
 */
export async function getNearbyGaugeReadings(
  lat: number,
  lon: number,
  radiusKm = 25
): Promise<GaugeReading[]> {
  const [minLon, minLat, maxLon, maxLat] = toBBox(lat, lon, radiusKm)

  const url = new URL('https://waterservices.usgs.gov/nwis/iv/')
  url.searchParams.set('format', 'json')
  url.searchParams.set('parameterCd', '00065') // gage height
  url.searchParams.set('bBox', `${minLon},${minLat},${maxLon},${maxLat}`)
  url.searchParams.set('siteType', 'ST')
  url.searchParams.set('period', 'P1D') // last 1 day only

  let data: USGSInstantResponse | null = null
  try {
    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`USGS request failed: HTTP ${res.status}`)
    }
    data = (await res.json()) as USGSInstantResponse
  } catch (err) {
    console.error('Failed fetching USGS gauges', err)
    // Decide whether to throw further or return empty list.
    throw err instanceof Error ? err : new Error('Unknown USGS error')
  }

  const tsArray = data.value?.timeSeries ?? []

  const out: GaugeReading[] = tsArray.map((ts) => {
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

    // classify trend based on delta magnitude
    let trend: GaugeTrend = 'steady'
    if (Math.abs(delta) < 0.05) {
      trend = 'steady'
    } else if (delta > 0.05) {
      trend = 'rising'
    } else if (delta < -0.05) {
      trend = 'falling'
    }

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
  })

  return out
}