/**
 * USGS Water Services helper functions.
 * Docs: https://waterservices.usgs.gov/
 */

export interface GaugeReading {
  siteId: string
  name: string
  lat: number
  lon: number
  gageHeight: number | null // in ft or m (unit indicated in `unit`)
  unit: string
  timestamp: string
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
    const latestValueArr = ts.values?.[0]?.value
    const latest = latestValueArr?.[latestValueArr.length - 1]

    return {
      siteId: site.siteCode[0].value,
      name: site.siteName,
      lat: site.geoLocation.geogLocation.latitude,
      lon: site.geoLocation.geogLocation.longitude,
      gageHeight: latest ? parseFloat(latest.value) : null,
      unit: ts.variable.unit.unitCode,
      timestamp: latest ? latest.dateTime : '',
    }
  })

  return out
}