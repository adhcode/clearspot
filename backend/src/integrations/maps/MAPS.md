# OpenStreetMap Overpass API Integration

## Overview

Production-ready integration with OpenStreetMap Overpass API for retrieving geographical context around incident locations.

**Purpose**: Gather nearby environmental features (schools, hospitals, waterways, etc.) to support risk assessment.

**Non-Purpose**: This service does NOT calculate risk scores or make severity decisions.

## Architecture

```
MapsModule
├── OverpassService      # Main service interface
├── OverpassClient       # HTTP client with retry logic
├── OverpassQueryBuilder # Query construction
├── types/               # TypeScript interfaces
├── constants/           # Search radii configuration
└── queries/             # Query builders
```

## Configuration

### Environment Variables

```bash
OVERPASS_API_URL=https://overpass-api.de/api/interpreter  # Optional, has default
```

The URL is validated during startup. The service will fail fast if configuration is invalid.

## Service Interface

### Main Method

```typescript
analyzeLocation(latitude: number, longitude: number): Promise<LocationContext>
```

**Parameters:**
- `latitude`: Incident latitude
- `longitude`: Incident longitude

**Returns:**
```typescript
interface LocationContext {
  schools: NearbyFeature[];
  hospitals: NearbyFeature[];
  clinics: NearbyFeature[];
  markets: NearbyFeature[];
  busStops: NearbyFeature[];
  primaryRoads: NearbyFeature[];
  trunkRoads: NearbyFeature[];
  waterways: NearbyFeature[];
}

interface NearbyFeature {
  name?: string;
  latitude: number;
  longitude: number;
  distanceInMeters: number;
}
```

## Search Configuration

### Search Radii

| Feature Type | Radius | Reasoning |
|-------------|--------|-----------|
| Schools | 1000m | Critical for children safety |
| Hospitals | 2000m | Wider healthcare coverage |
| Clinics | 1500m | Moderate healthcare coverage |
| Markets | 1000m | High public density areas |
| Bus Stops | 500m | Immediate vicinity |
| Primary Roads | 1000m | Major traffic routes |
| Trunk Roads | 1500m | Major highways |
| Waterways | 2000m | Water contamination spreads |

### OpenStreetMap Tags

| Feature | OSM Tag |
|---------|---------|
| Schools | `amenity=school` |
| Hospitals | `amenity=hospital` |
| Clinics | `amenity=clinic` |
| Markets | `amenity=marketplace` |
| Bus Stops | `highway=bus_stop` |
| Primary Roads | `highway=primary` |
| Trunk Roads | `highway=trunk` |
| Waterways | `waterway=*`, `natural=water` |

## Features

### Distance Calculation

Uses **Haversine formula** for accurate distance calculation:
- Accounts for Earth's curvature
- Returns distance in meters
- Rounded to nearest meter

### Reliability

**Request Timeout**: 30 seconds
**Retry Strategy**: Single retry for transient failures
**Graceful Fallback**: Returns empty context on failure (never crashes incident creation)

### Data Quality

- **Deduplication**: Removes duplicate features by coordinates
- **Sorting**: Results sorted by distance (nearest first)
- **Limiting**: Max 10 results per category
- **Validation**: Handles missing names, invalid coordinates

## Usage Example

```typescript
import { OverpassService } from '@integrations/maps/overpass.service';

@Injectable()
export class RiskAssessmentService {
  constructor(private overpassService: OverpassService) {}

  async assessRisk(latitude: number, longitude: number) {
    const context = await this.overpassService.analyzeLocation(latitude, longitude);

    // Use context for risk assessment
    if (context.schools.length > 0) {
      const nearestSchool = context.schools[0];
      console.log(`School ${nearestSchool.distanceInMeters}m away`);
    }
  }
}
```

## Error Handling

**Network Failures**: Retried once, then graceful fallback
**Timeout**: 30 second timeout enforced
**Invalid Response**: Logged and returns empty context
**API Rate Limiting**: Handled by Overpass API itself

## Logging

Logs include:
- Request duration
- Feature counts per category
- Failures and retries
- Query latency

**Does NOT log:**
- Raw API responses
- Sensitive user data
- Coordinates (except in analysis start/complete logs)

## Performance

- **Reuses HTTP client**: No per-request instantiation
- **Batch queries**: Single API call retrieves all features
- **Efficient parsing**: Streams through elements once
- **Bounded results**: Max 10 per category prevents memory issues

## Maintenance

### Adding New Feature Types

1. Add tag to `constants/search-radii.constants.ts`
2. Add field to `LocationContext` interface
3. Update query builder in `queries/overpass-query.builder.ts`
4. Update parser in `overpass.service.ts`

### Adjusting Search Radii

Edit `SEARCH_RADII` in `constants/search-radii.constants.ts`:

```typescript
export const SEARCH_RADII = {
  SCHOOLS: 1500, // Increase to 1.5km
  // ...
};
```

## Overpass Query Format

Example generated query:

```
[out:json][timeout:25];
(
  node["amenity=school"](around:1000,6.5244,3.3792);
  way["amenity=school"](around:1000,6.5244,3.3792);
  node["amenity=hospital"](around:2000,6.5244,3.3792);
  way["amenity=hospital"](around:2000,6.5244,3.3792);
  // ... more queries
);
out center;
```

## Testing

```bash
# Unit tests
pnpm test maps

# Integration tests
pnpm test:e2e maps

# Manual test
curl -X POST "http://localhost:3000/api/v1/risk/analyze" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 6.5244, "longitude": 3.3792}'
```

## References

- [Overpass API Documentation](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [OpenStreetMap Tag Documentation](https://wiki.openstreetmap.org/wiki/Map_features)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
