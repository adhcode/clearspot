# Maps Integration - Quick Start

Production-ready OpenStreetMap Overpass API integration for geographical context gathering.

## Purpose

✅ **Does**: Retrieve nearby geographical features (schools, hospitals, waterways, etc.)
❌ **Does NOT**: Calculate risk scores or make severity decisions

## Installation

Already integrated! No additional dependencies needed.

## Configuration

Add to `.env` (optional - has default):

```bash
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
```

## Usage

### Import the Module

```typescript
import { MapsModule } from '@integrations/maps/maps.module';

@Module({
  imports: [MapsModule],
  // ...
})
export class YourModule {}
```

### Use the Service

```typescript
import { OverpassService } from '@integrations/maps/overpass.service';

@Injectable()
export class YourService {
  constructor(private overpassService: OverpassService) {}

  async analyze(lat: number, lon: number) {
    const context = await this.overpassService.analyzeLocation(lat, lon);
    
    console.log(`Found ${context.schools.length} schools nearby`);
    console.log(`Nearest school: ${context.schools[0]?.distanceInMeters}m away`);
  }
}
```

## What You Get

```typescript
interface LocationContext {
  schools: NearbyFeature[];       // Within 1km
  hospitals: NearbyFeature[];     // Within 2km
  clinics: NearbyFeature[];       // Within 1.5km
  markets: NearbyFeature[];       // Within 1km
  busStops: NearbyFeature[];      // Within 500m
  primaryRoads: NearbyFeature[];  // Within 1km
  trunkRoads: NearbyFeature[];    // Within 1.5km
  waterways: NearbyFeature[];     // Within 2km
}

interface NearbyFeature {
  name?: string;
  latitude: number;
  longitude: number;
  distanceInMeters: number;  // Calculated using Haversine formula
}
```

## Features

✅ **Reliable**
- 30-second timeout
- Single retry on failure
- Graceful fallback (returns empty context)
- Never crashes incident creation

✅ **Accurate**
- Haversine distance calculation
- Sorted by distance (nearest first)
- Deduplication
- Max 10 results per category

✅ **Performant**
- Single API call for all features
- Reuses HTTP client
- Efficient parsing
- Bounded memory usage

## Documentation

- **[MAPS.md](./MAPS.md)** - Complete documentation
- **[USAGE_EXAMPLE.md](./USAGE_EXAMPLE.md)** - Risk assessment example
- **[test-overpass.ts](./test-overpass.ts)** - Manual testing script

## Testing

```bash
# Unit tests
pnpm test maps

# Manual test with real API
ts-node -r tsconfig-paths/register src/integrations/maps/test-overpass.ts
```

## Example Response

```json
{
  "schools": [
    {
      "name": "Government Primary School",
      "latitude": 6.5254,
      "longitude": 3.3802,
      "distanceInMeters": 157
    }
  ],
  "hospitals": [
    {
      "name": "Lagos State Teaching Hospital",
      "latitude": 6.5344,
      "longitude": 3.3892,
      "distanceInMeters": 1234
    }
  ],
  "waterways": [
    {
      "name": "Lagos Lagoon",
      "latitude": 6.5144,
      "longitude": 3.3692,
      "distanceInMeters": 1567
    }
  ]
}
```

## Architecture Principles

1. **Single Responsibility**: Only gathers geographical data
2. **Separation of Concerns**: Risk assessment logic belongs elsewhere
3. **Fail-Safe**: Never blocks incident creation
4. **SOLID**: Clean, maintainable, extensible code
5. **Type-Safe**: No `any`, full TypeScript types

## Status

✅ Implemented
✅ Tested
✅ Documented
✅ Integrated into AppModule
✅ Ready for Risk Assessment Service consumption
