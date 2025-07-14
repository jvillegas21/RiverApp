/**
 * Utility functions to parse location information from USGS river station names
 * This helps reduce reverse geocoding API calls by extracting location data
 * that's already available in the station names.
 */

export interface ParsedLocation {
  city: string | null;
  county: string | null;
  state: string | null;
  fullLocation: string | null;
}

/**
 * Parse location information from USGS river station names
 * Common patterns:
 * - "River Name at Location, State" (e.g., "San Gabriel Rv at Laneport, TX")
 * - "River Name nr Location, State" (e.g., "Little Rv nr Rockdale, TX") 
 * - "River Name at FM Road nr Location, State" (e.g., "Brushy Ck at FM 619 nr Taylor, TX")
 * - "River Name at Location, County, State" (e.g., "Colorado Rv at Austin, Travis, TX")
 */
export function parseLocationFromRiverName(riverName: string): ParsedLocation {
  if (!riverName) {
    return { city: null, county: null, state: null, fullLocation: null };
  }

  // Common location indicators in USGS names
  const locationIndicators = [
    ' at ',
    ' nr ',
    ' near ',
    ' above ',
    ' below ',
    ' upstream from ',
    ' downstream from '
  ];

  let locationPart = '';
  
  // Find the location part after any of the indicators
  for (const indicator of locationIndicators) {
    const parts = riverName.split(indicator);
    if (parts.length > 1) {
      locationPart = parts[1];
      break;
    }
  }

  // If no indicator found, try to extract from the end (after last comma)
  if (!locationPart) {
    const lastCommaIndex = riverName.lastIndexOf(',');
    if (lastCommaIndex !== -1) {
      locationPart = riverName.substring(lastCommaIndex + 1).trim();
    }
  }

  if (!locationPart) {
    return { city: null, county: null, state: null, fullLocation: null };
  }

  // Parse the location part
  const locationParts = locationPart.split(',').map(part => part.trim());
  
  let city: string | null = null;
  let county: string | null = null;
  let state: string | null = null;

  // Handle different location formats
  if (locationParts.length === 1) {
    // "Location, State" or just "Location"
    const part = locationParts[0];
    if (isStateCode(part)) {
      state = part;
    } else {
      city = part;
    }
  } else if (locationParts.length === 2) {
    // "Location, State" or "City, County"
    const [first, second] = locationParts;
    if (isStateCode(second)) {
      city = first;
      state = second;
    } else {
      city = first;
      county = second;
    }
  } else if (locationParts.length >= 3) {
    // "City, County, State" or "City, County, State, Country"
    city = locationParts[0];
    county = locationParts[1];
    state = locationParts[2];
  }

  // Clean up city names (remove common prefixes/suffixes)
  if (city) {
    city = cleanCityName(city);
  }

  // Create full location string
  const fullLocation = [city, county, state].filter(Boolean).join(', ');

  return {
    city,
    county,
    state,
    fullLocation: fullLocation || null
  };
}

/**
 * Check if a string is a US state code
 */
function isStateCode(str: string): boolean {
  const stateCodes = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];
  return stateCodes.includes(str.toUpperCase());
}

/**
 * Clean up city names by removing common prefixes/suffixes and road references
 */
function cleanCityName(cityName: string): string {
  if (!cityName) return cityName;

  let cleaned = cityName;

  // Remove road references (FM, TX, US, etc.)
  cleaned = cleaned.replace(/\b(FM|TX|US|HWY|HIGHWAY|ROAD|RD|STREET|ST|AVE|AVENUE)\s+\d+\b/gi, '').trim();
  
  // Remove common prefixes
  cleaned = cleaned.replace(/^(at|nr|near|above|below)\s+/i, '').trim();
  
  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;]+$/, '').trim();
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned || cityName;
}

/**
 * Extract a display-friendly location string from a river name
 * Returns the most relevant location information for display
 */
export function getDisplayLocation(riverName: string): string | null {
  const parsed = parseLocationFromRiverName(riverName);
  
  // Prefer city over county, but show both if available
  if (parsed.city && parsed.county) {
    return `${parsed.city} (${parsed.county})`;
  } else if (parsed.city) {
    return parsed.city;
  } else if (parsed.county) {
    return parsed.county;
  } else if (parsed.state) {
    return parsed.state;
  }
  
  return null;
}

/**
 * Check if a river name contains location information
 */
export function hasLocationInfo(riverName: string): boolean {
  const locationIndicators = [' at ', ' nr ', ' near ', ' above ', ' below '];
  return locationIndicators.some(indicator => riverName.includes(indicator));
} 