export const SEARCH_RADII = {
  SCHOOLS: 500, // 500m - critical for children safety
  HOSPITALS: 1000, // 1km - healthcare coverage
  CLINICS: 500, // 500m - healthcare coverage
  MARKETS: 500, // 500m - high public density areas
  BUS_STOPS: 300, // 300m - immediate vicinity
  PRIMARY_ROADS: 500, // 500m - major traffic routes
  TRUNK_ROADS: 1000, // 1km - major highways
  WATERWAYS: 1000, // 1km - water contamination spreads
} as const;

export const OVERPASS_TAGS = {
  SCHOOLS: { key: 'amenity', value: 'school' },
  HOSPITALS: { key: 'amenity', value: 'hospital' },
  CLINICS: { key: 'amenity', value: 'clinic' },
  MARKETS: { key: 'amenity', value: 'marketplace' },
  BUS_STOPS: { key: 'highway', value: 'bus_stop' },
  PRIMARY_ROADS: { key: 'highway', value: 'primary' },
  TRUNK_ROADS: { key: 'highway', value: 'trunk' },
  WATERWAYS: { key: 'waterway', value: null }, // waterway can have any value
} as const;

export const MAX_RESULTS_PER_CATEGORY = 10;
