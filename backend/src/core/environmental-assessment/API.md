# Environmental Assessment API Documentation

## Overview

The Assessment API provides high-performance access to persisted environmental assessments. **It never triggers re-analysis** - all data is retrieved from database snapshots.

## Key Principles

### 1. **No Re-Computation**
- Assessment endpoints only read persisted data
- Never call Gemini AI
- Never call Overpass API
- Never trigger historical analysis
- Response times: milliseconds (not seconds)

### 2. **No Direct External API Access**
- Frontend never calls Overpass directly
- Frontend never calls Gemini directly
- All intelligence is pre-processed and stored
- Single API call provides complete context

### 3. **Repository Pattern**
- Prisma models never exposed to controllers
- DTOs transform database types to API contracts
- Clean separation between persistence and business logic

## Endpoints

### GET /api/v1/incidents/:id/assessment

Retrieve the latest assessment for an incident.

**Auth**: Public (no authentication required)

**Response Time**: ~500-1000ms (database query only)

**Response**:

```typescript
{
  id: string;
  incidentId: string;
  score: number; // 0-100
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCleanupCost: number;
  aiConfidence: number | null;
  reasons: string[];
  recommendations: string[];
  visualAnalysis: {
    wasteType: string;
    estimatedSize: string;
    hazardous: boolean;
    isIllegalDump: boolean;
    roadBlocked: boolean;
    drainageBlocked: boolean;
    fireDetected: boolean;
    smokeDetected: boolean;
    standingWater: boolean;
  } | null;
  locationIntelligence: {
    schools: Array<{name?: string; distanceInMeters: number}>;
    hospitals: Array<{name?: string; distanceInMeters: number}>;
    clinics: Array<{name?: string; distanceInMeters: number}>;
    markets: Array<{name?: string; distanceInMeters: number}>;
    busStops: Array<{name?: string; distanceInMeters: number}>;
    primaryRoads: Array<{name?: string; distanceInMeters: number}>;
    trunkRoads: Array<{name?: string; distanceInMeters: number}>;
    waterways: Array<{name?: string; distanceInMeters: number}>;
    sourceStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  };
  historicalContext: {
    nearbyReportsCount: number;
    unresolvedIncidentsCount: number;
    isRecurringHotspot: boolean;
    averageResolutionHours: number | null;
    previousReportsLast30Days: number;
  };
  assessmentVersion: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:

```bash
GET /api/v1/incidents/cmrvay91g00019rs3468xls0j/assessment

# Response (600ms)
{
  "id": "cmrvayasc00049rs3x1ckb0li",
  "score": 100,
  "priority": "CRITICAL",
  "estimatedCleanupCost": 480000,
  "visualAnalysis": {
    "wasteType": "Toxic/Hazardous",
    "hazardous": true,
    "isIllegalDump": true
  },
  "locationIntelligence": {
    "schools": [{"distanceInMeters": 472}],
    "hospitals": [
      {"name": "MARANATHA MEDICAL CENTER", "distanceInMeters": 548}
    ],
    "waterways": [{"distanceInMeters": 79}],
    "sourceStatus": "SUCCESS"
  },
  "reasons": [
    "Illegal waste dumping detected",
    "Hazardous materials identified: Toxic/Hazardous",
    "Located 472m from school"
  ],
  "recommendations": [
    "⚠️ Immediate cleanup required within 6 hours",
    "Notify environmental authority immediately"
  ]
}
```

**Errors**:

```typescript
// 404 Not Found
{
  "statusCode": 404,
  "message": "Assessment not found for incident {id}. The incident may not have been analyzed yet.",
  "error": "Not Found"
}
```

## Data Structures

### Location Intelligence

Pre-processed geographic context from OpenStreetMap:

```typescript
interface LocationIntelligence {
  schools: NearbyFeature[];
  hospitals: NearbyFeature[];
  clinics: NearbyFeature[];
  markets: NearbyFeature[];
  busStops: NearbyFeature[];
  primaryRoads: NearbyFeature[];
  trunkRoads: NearbyFeature[];
  waterways: NearbyFeature[];
  sourceStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL';
}

interface NearbyFeature {
  name?: string;
  distanceInMeters: number;
}
```

**Source Status**:
- `SUCCESS`: Geographic data retrieved successfully
- `PARTIAL`: Some data retrieved (< 3 features)
- `FAILED`: No geographic data available
- `undefined`: Status not tracked (older assessments)

### Visual Analysis

AI-processed visual intelligence from Gemini:

```typescript
interface VisualAnalysis {
  wasteType: string;              // "Household Waste", "Toxic/Hazardous", etc.
  estimatedSize: string;          // "Small", "Medium", "Large", "Very Large"
  hazardous: boolean;             // Is hazardous material present?
  isIllegalDump: boolean;         // Confirmed illegal dumping?
  roadBlocked: boolean;           // Blocking traffic?
  drainageBlocked: boolean;       // Blocking drainage?
  fireDetected: boolean;          // Active fire hazard?
  smokeDetected: boolean;         // Smoke present?
  standingWater: boolean;         // Standing water (mosquito breeding)?
}
```

### Historical Context

Aggregated pattern data from database:

```typescript
interface HistoricalContext {
  nearbyReportsCount: number;           // Reports within 1km
  unresolvedIncidentsCount: number;     // Open incidents nearby
  isRecurringHotspot: boolean;          // 3+ reports in 30 days
  averageResolutionHours: number | null; // Average cleanup time
  previousReportsLast30Days: number;    // Recent activity
}
```

## Frontend Integration

### Loading Assessment Data

```typescript
// React/Next.js example
async function fetchAssessment(incidentId: string) {
  const response = await fetch(
    `${API_URL}/incidents/${incidentId}/assessment`
  );
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // Assessment not yet generated
    }
    throw new Error('Failed to load assessment');
  }
  
  return await response.json();
}

// Usage
const assessment = await fetchAssessment(incident.id);

// Display in UI
<AssessmentCard 
  score={assessment.score}
  priority={assessment.priority}
  reasons={assessment.reasons}
  locationIntelligence={assessment.locationIntelligence}
/>
```

### Rendering Location Intelligence

```typescript
function LocationMap({ locationIntelligence }) {
  const { schools, hospitals, waterways, sourceStatus } = locationIntelligence;
  
  return (
    <div>
      {sourceStatus === 'FAILED' && (
        <Alert>Geographic data unavailable</Alert>
      )}
      
      {schools.map(school => (
        <Marker 
          position={calculatePosition(school)}
          icon="school"
          label={`${school.distanceInMeters}m away`}
        />
      ))}
      
      {hospitals.map(hospital => (
        <Marker 
          position={calculatePosition(hospital)}
          icon="hospital"
          label={hospital.name}
        />
      ))}
    </div>
  );
}
```

### Priority Badge

```typescript
const priorityColors = {
  LOW: 'bg-gray-500',
  MEDIUM: 'bg-yellow-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-600'
};

function PriorityBadge({ priority, score }) {
  return (
    <div className={`badge ${priorityColors[priority]}`}>
      {priority} ({score}/100)
    </div>
  );
}
```

## Performance Characteristics

### Incident Creation (with Analysis)
- **Time**: 15-25 seconds
- **Operations**: 
  - AI analysis (Gemini): 5-8s
  - Geographic context (Overpass): 2-13s
  - Historical analysis (Database): < 1s
  - Assessment computation: < 1s
  - Persistence (Transaction): < 2s

### Assessment Retrieval
- **Time**: 500-1000ms
- **Operations**:
  - Database query: 500-1000ms
  - DTO transformation: < 1ms
  - JSON serialization: < 1ms

**Performance Improvement**: **95-98% faster** than re-analysis

## Error Handling

### Assessment Not Found

```typescript
try {
  const assessment = await fetchAssessment(incidentId);
} catch (error) {
  if (error.status === 404) {
    // Incident exists but not yet assessed
    // Show "Assessment pending..." message
    return <PendingState />;
  }
  throw error;
}
```

### Source Status Handling

```typescript
function LocationIntelligenceSection({ locationIntelligence }) {
  const { sourceStatus, schools, hospitals, waterways } = locationIntelligence;
  
  if (sourceStatus === 'FAILED') {
    return (
      <InfoBox>
        Geographic data unavailable. Assessment based on AI analysis and 
        historical patterns only.
      </InfoBox>
    );
  }
  
  if (sourceStatus === 'PARTIAL') {
    return (
      <WarningBox>
        Limited geographic data available. Some nearby features may not be shown.
      </WarningBox>
    );
  }
  
  // Render full location intelligence
  return <LocationMap features={{schools, hospitals, waterways}} />;
}
```

## Future Enhancements

### Planned Data Sources

The location intelligence structure supports future additions:

```typescript
interface FutureLocationIntelligence extends LocationIntelligence {
  weather?: {
    temperature: number;
    precipitation: number;
    conditions: string;
  };
  floodAlerts?: Array<{
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    issuedAt: Date;
  }>;
  airQuality?: {
    aqi: number;
    pollutants: string[];
  };
  satelliteImagery?: {
    url: string;
    capturedAt: Date;
  };
  lawmaZones?: {
    zoneName: string;
    operationalStatus: string;
  };
}
```

### Assessment History

Future endpoint for tracking assessment changes over time:

```typescript
GET /api/v1/incidents/:id/assessment/history

// Returns array of assessments showing how priority changed
[
  { version: "1.0.0", score: 100, priority: "CRITICAL", generatedAt: "..." },
  { version: "1.1.0", score: 95, priority: "CRITICAL", generatedAt: "..." }
]
```

## Best Practices

### 1. **Always Use Assessment Endpoint**
- ❌ Don't: Recompute scores on frontend
- ✅ Do: Fetch persisted assessment

### 2. **Handle Missing Assessments**
- New incidents may not have assessments immediately
- Show "Assessment pending" state
- Poll or use WebSocket for updates

### 3. **Respect Source Status**
- Don't assume geographic data is always available
- Show appropriate UI for FAILED or PARTIAL status
- Explain why data might be missing

### 4. **Cache Appropriately**
- Assessments are immutable snapshots
- Safe to cache for 5-10 minutes
- Invalidate cache when incident is re-analyzed

### 5. **Display Complete Context**
- Show all nearby features (schools, hospitals, etc.)
- Display distances for spatial awareness
- Highlight critical features (schools near hazardous waste)

## Related Documentation

- `PERSISTENCE.md` - Assessment storage architecture
- `README.md` - Assessment engine overview
- `ARCHITECTURE.md` - System architecture

## Status

✅ **Implemented and Tested**
- High-performance retrieval service
- Clean DTO layer
- Repository pattern
- Public API endpoint
- Source status tracking
- Error handling
- Documentation complete
