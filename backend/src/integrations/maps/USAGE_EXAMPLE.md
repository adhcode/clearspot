# Maps Integration - Usage Example

## Example: Risk Assessment Service

Here's how a Risk Assessment Service would consume the OverpassService:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OverpassService } from '@integrations/maps/overpass.service';
import { LocationContext } from '@integrations/maps/types/location-context.types';

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);

  constructor(private overpassService: OverpassService) {}

  async assessEnvironmentalRisk(
    latitude: number,
    longitude: number,
  ): Promise<RiskAssessment> {
    // Step 1: Gather geographical context
    const context = await this.overpassService.analyzeLocation(latitude, longitude);

    // Step 2: Analyze context and calculate risk
    return this.calculateRisk(context, latitude, longitude);
  }

  private calculateRisk(
    context: LocationContext,
    latitude: number,
    longitude: number,
  ): RiskAssessment {
    let riskScore = 0;
    const factors: string[] = [];

    // High risk: Schools within 500m
    const nearbySchools = context.schools.filter((s) => s.distanceInMeters <= 500);
    if (nearbySchools.length > 0) {
      riskScore += 40;
      factors.push(`${nearbySchools.length} school(s) within 500m`);
      this.logger.warn(
        `High risk: ${nearbySchools.length} schools near ${latitude},${longitude}`,
      );
    }

    // Medium-high risk: Hospitals or clinics within 1km
    const nearbyHealthcare = [
      ...context.hospitals.filter((h) => h.distanceInMeters <= 1000),
      ...context.clinics.filter((c) => c.distanceInMeters <= 1000),
    ];
    if (nearbyHealthcare.length > 0) {
      riskScore += 30;
      factors.push(`${nearbyHealthcare.length} healthcare facilities within 1km`);
    }

    // Medium risk: Waterways within 500m (contamination risk)
    const nearbyWaterways = context.waterways.filter((w) => w.distanceInMeters <= 500);
    if (nearbyWaterways.length > 0) {
      riskScore += 25;
      factors.push(`${nearbyWaterways.length} waterway(s) within 500m - contamination risk`);
    }

    // Low-medium risk: Markets (high foot traffic)
    const nearbyMarkets = context.markets.filter((m) => m.distanceInMeters <= 500);
    if (nearbyMarkets.length > 0) {
      riskScore += 15;
      factors.push(`${nearbyMarkets.length} market(s) within 500m - high foot traffic`);
    }

    // Additional risk: Major roads (air quality, visibility)
    const nearbyMajorRoads = [
      ...context.primaryRoads.filter((r) => r.distanceInMeters <= 200),
      ...context.trunkRoads.filter((r) => r.distanceInMeters <= 200),
    ];
    if (nearbyMajorRoads.length > 0) {
      riskScore += 10;
      factors.push(`${nearbyMajorRoads.length} major road(s) within 200m`);
    }

    return {
      riskScore: Math.min(riskScore, 100), // Cap at 100
      riskLevel: this.getRiskLevel(riskScore),
      factors,
      context, // Include full context for reference
    };
  }

  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }
}

interface RiskAssessment {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  context: LocationContext;
}
```

## Module Setup

```typescript
import { Module } from '@nestjs/common';
import { MapsModule } from '@integrations/maps/maps.module';
import { RiskAssessmentService } from './risk-assessment.service';

@Module({
  imports: [MapsModule], // Import MapsModule to access OverpassService
  providers: [RiskAssessmentService],
  exports: [RiskAssessmentService],
})
export class RiskModule {}
```

## Controller Example

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { RiskAssessmentService } from './risk-assessment.service';

@Controller('risk')
export class RiskController {
  constructor(private riskService: RiskAssessmentService) {}

  @Post('analyze')
  async analyzeLocation(@Body() dto: { latitude: number; longitude: number }) {
    return this.riskService.assessEnvironmentalRisk(dto.latitude, dto.longitude);
  }
}
```

## Test Request

```bash
curl -X POST http://localhost:3000/api/v1/risk/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 6.5244,
    "longitude": 3.3792
  }'
```

## Expected Response

```json
{
  "riskScore": 75,
  "riskLevel": "CRITICAL",
  "factors": [
    "2 school(s) within 500m",
    "1 healthcare facilities within 1km",
    "1 waterway(s) within 500m - contamination risk"
  ],
  "context": {
    "schools": [
      {
        "name": "Government Primary School",
        "latitude": 6.5254,
        "longitude": 3.3802,
        "distanceInMeters": 157
      }
    ],
    "hospitals": [...],
    "waterways": [...]
  }
}
```

## Key Principles

1. **OverpassService provides data, not decisions**
   - It returns raw geographical context
   - Risk calculation logic belongs in RiskAssessmentService

2. **Graceful degradation**
   - If Overpass fails, context will be empty
   - Risk assessment should handle empty context gracefully
   - Never crash incident creation due to mapping failures

3. **Separation of concerns**
   - Controllers never call OverpassService directly
   - Only RiskAssessmentService consumes geographical context
   - Business logic stays in domain services

4. **Performance considerations**
   - Cache results if analyzing same location repeatedly
   - Consider async processing for non-critical risk assessments
   - Monitor Overpass API response times

## Testing

```typescript
describe('RiskAssessmentService', () => {
  let service: RiskAssessmentService;
  let overpassService: OverpassService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RiskAssessmentService,
        {
          provide: OverpassService,
          useValue: {
            analyzeLocation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(RiskAssessmentService);
    overpassService = module.get(OverpassService);
  });

  it('should assess high risk for location near school', async () => {
    const mockContext = {
      schools: [
        { name: 'Test School', latitude: 6.5244, longitude: 3.3792, distanceInMeters: 100 },
      ],
      hospitals: [],
      clinics: [],
      markets: [],
      busStops: [],
      primaryRoads: [],
      trunkRoads: [],
      waterways: [],
    };

    jest.spyOn(overpassService, 'analyzeLocation').mockResolvedValue(mockContext);

    const result = await service.assessEnvironmentalRisk(6.5244, 3.3792);

    expect(result.riskLevel).toBe('HIGH');
    expect(result.factors).toContain(expect.stringContaining('school'));
  });
});
```
