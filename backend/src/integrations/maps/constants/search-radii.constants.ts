export const SEARCH_RADII = {
  SCHOOLS: 1000, // 1km - critical for children safety
  HOSPITALS: 2000, // 2km - wider healthcare coverage
  CLINICS: 1500, // 1.5km - moderate healthcare coverage
  MARKETS: 1000, // 1km - high public density areas
  BUS_STOPS: 500, // 500m - immediate vicinity
  PRIMARY_ROADS: 1000, // 1km - major traffic routes
  TRUNK_ROADS: 1500, // 1.5km - major highways
  WATERWAYS: 2000, // 2km - water contamination spreads
} as const;

export const OVERPASS_TAGS = {
  SCHOOLS: 'amenity=school',
  HOSPITALS: 'amenity=hospital',
  CLINICS: 'amenity=clinic',
  MARKETS: 'amenity=marketplace',
  BUS_STOPS: 'highway=bus_stop',
  PRIMARY_ROADS: 'highway=primary',
  TRUNK_ROADS: 'highway=trunk',
  WATERWAYS: 'waterway',
} as const;

export const MAX_RESULTS_PER_CATEGORY = 10;
