// Input validation utilities

/**
 * Validate and sanitize coordinate values
 * @param {*} lat - Latitude value
 * @param {*} lng - Longitude value
 * @returns {Object} Validation result with sanitized values
 */
const validateCoordinates = (lat, lng) => {
  const errors = [];
  
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  
  if (isNaN(latNum)) {
    errors.push('Latitude must be a valid number');
  } else if (latNum < -90 || latNum > 90) {
    errors.push('Latitude must be between -90 and 90 degrees');
  }
  
  if (isNaN(lngNum)) {
    errors.push('Longitude must be a valid number');
  } else if (lngNum < -180 || lngNum > 180) {
    errors.push('Longitude must be between -180 and 180 degrees');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    lat: Math.max(-90, Math.min(90, latNum)),
    lng: Math.max(-180, Math.min(180, lngNum))
  };
};

/**
 * Validate and sanitize radius value
 * @param {*} radius - Radius value in miles
 * @param {number} min - Minimum allowed radius (default: 0.1)
 * @param {number} max - Maximum allowed radius (default: 100)
 * @returns {Object} Validation result with sanitized value
 */
const validateRadius = (radius, min = 0.1, max = 100) => {
  const errors = [];
  const radiusNum = parseFloat(radius);
  
  if (isNaN(radiusNum)) {
    errors.push('Radius must be a valid number');
  } else if (radiusNum < min) {
    errors.push(`Radius must be at least ${min} miles`);
  } else if (radiusNum > max) {
    errors.push(`Radius cannot exceed ${max} miles`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    value: Math.max(min, Math.min(max, radiusNum))
  };
};

/**
 * Validate USGS site ID
 * @param {*} siteId - USGS site identifier
 * @returns {Object} Validation result
 */
const validateSiteId = (siteId) => {
  const errors = [];
  
  if (!siteId) {
    errors.push('Site ID is required');
  } else if (typeof siteId !== 'string') {
    errors.push('Site ID must be a string');
  } else if (!/^\d{8,15}$/.test(siteId)) {
    errors.push('Site ID must be 8-15 digits');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    value: String(siteId).trim()
  };
};

/**
 * Validate pagination parameters
 * @param {*} page - Page number
 * @param {*} limit - Items per page
 * @param {number} maxLimit - Maximum items per page (default: 100)
 * @returns {Object} Validation result with sanitized values
 */
const validatePagination = (page = 1, limit = 10, maxLimit = 100) => {
  const errors = [];
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    errors.push('Page must be a positive integer');
  }
  
  if (isNaN(limitNum) || limitNum < 1) {
    errors.push('Limit must be a positive integer');
  } else if (limitNum > maxLimit) {
    errors.push(`Limit cannot exceed ${maxLimit}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    page: Math.max(1, pageNum),
    limit: Math.max(1, Math.min(maxLimit, limitNum)),
    offset: Math.max(0, (Math.max(1, pageNum) - 1) * Math.max(1, Math.min(maxLimit, limitNum)))
  };
};

/**
 * Sanitize string input to prevent XSS
 * @param {*} input - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
const sanitizeString = (input, maxLength = 1000) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Basic XSS prevention
};

/**
 * Validate request body against schema
 * @param {Object} body - Request body
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result
 */
const validateRequestBody = (body, schema) => {
  const errors = [];
  const sanitized = {};
  
  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in body) || body[field] === null || body[field] === undefined) {
        errors.push(`Field '${field}' is required`);
      }
    }
  }
  
  // Validate and sanitize fields
  for (const [field, rules] of Object.entries(schema.fields || {})) {
    const value = body[field];
    
    if (value !== undefined && value !== null) {
      if (rules.type === 'string') {
        sanitized[field] = sanitizeString(value, rules.maxLength);
      } else if (rules.type === 'number') {
        const num = parseFloat(value);
        if (isNaN(num)) {
          errors.push(`Field '${field}' must be a valid number`);
        } else {
          sanitized[field] = num;
        }
      } else if (rules.type === 'array') {
        if (!Array.isArray(value)) {
          errors.push(`Field '${field}' must be an array`);
        } else {
          sanitized[field] = value;
        }
      } else {
        sanitized[field] = value;
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitized
  };
};

module.exports = {
  validateCoordinates,
  validateRadius,
  validateSiteId,
  validatePagination,
  sanitizeString,
  validateRequestBody
};