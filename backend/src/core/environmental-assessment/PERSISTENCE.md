# Environmental Assessment Persistence

## Overview

Environmental assessments are now persisted in a dedicated `IncidentAssessment` model, providing a complete audit trail of assessment snapshots with versioning support.

## Architecture

### Database Schema

```
Incident (1) ──── (1) IncidentAssessment
```

Each incident has exactly one assessment that represents the latest evaluation.

### Data Model

```typescript
model IncidentAssessment {
  id                    String            @id
  incidentId            String            @unique
  score                 Int               // 0-100
  priority              IncidentSeverity  // LOW | MEDIUM | HIGH | CRITICAL
  estimatedCleanupCost  Decimal
  aiConfidence          Float?
  reasons               String[]          // Human-readable explanations
  recommendations       String[]          // Action items
  visualAnalysis        Json?             // Processed AI analysis
  locationContext       Json              // Geographic data
  historicalContext     Json              // Historical patterns
  assessmentVersion     String            // e.g., "1.0.0"
  generatedAt           DateTime
  createdAt             DateTime
  updatedAt             DateTime
}
```

## Stored Data Structures

### Visual Analysis (JSON)

Processed output from Gemini AI:

```json
{
  "wasteType": "Toxic/Hazardous",
  "estimatedSize": "Large",
  "hazardous": true,
  "isIllegalDump": true,
  "roadBlocked": false,
  "drainageBlocked": true,
  "fireDetected": false,
  "smokeDetected": false,
  "standingWater": false
}
```

### Location Context (JSON)

Processed output from Overpass API:

```json
{
  "schools": [
    {
      "name": "Test Primary School",
      "distanceInMeters": 180
    }
  ],
  "hospitals": [
    {
      "name": "Lagos General Hospital",
      "distanceInMeters": 450
    }
  ],
  "waterways": [
    {
      "name": "Lagos River",
      "distanceInMeters": 300
    }
  ],
  "markets": [],
  "clinics": [],
  "busStops": [],
  "primaryRoads": [],
  "trunkRoads": []
}
```

### Historical Context (JSON)

Aggregated historical data:

```json
{
  "nearbyReportsCount": 23,
  "unresolvedIncidentsCount": 5,
  "isRecurringHotspot": true,
  "averageResolutionHours": 72.5,
  "previousReportsLast30Days": 23
}
```

## Persistence Flow

```
1. Incident Created
   ↓
2. AI Analysis (Gemini)
   ↓
3. Geographic Context (Overpass)
   ↓
4. Historical Analysis (Database)
   ↓
5. Environmental Assessment Service
   │   - Calculates score (0-100)
   │   - Determines priority
   │   - Generates reasons & recommendations
   │   - Estimates cleanup cost
   ↓
6. Prepare Persistence Data
   │   - Transform domain objects to JSON
   │   - Add version info
   │   - Timestamp generation
   ↓
7. Transaction:
   │   a) Update Incident.severity
   │   b) Upsert IncidentAssessment
   ↓
8. Commit
```

## Repository Pattern

The `IncidentAssessmentRepository` handles all persistence operations:

```typescript
class IncidentAssessmentRepository {
  // Create or update assessment (ensures exactly one per incident)
  async upsertAssessment(data: AssessmentPersistenceData): Promise<IncidentAssessment>
  
  // Retrieve assessment by incident ID
  async findByIncidentId(incidentId: string): Promise<IncidentAssessment | null>
  
  // Query assessments by priority
  async findByPriority(priority: string, limit?: number): Promise<IncidentAssessment[]>
  
  // Get statistics
  async getStatistics(): Promise<{
    total: number;
    byPriority: Record<string, number>;
    averageScore: number;
  }>
}
```

## Key Design Decisions

### 1. **Separation of Concerns**

Assessment data is stored separately from incident operational data:
- `Incident`: Status, location, reporter info
- `IncidentAssessment`: Score, analysis, context, recommendations

### 2. **Immutable Snapshots**

Each assessment represents a point-in-time evaluation:
- `generatedAt`: When the assessment was performed
- `assessmentVersion`: Algorithm version used
- JSON structures preserve complete analysis context

### 3. **Upsert Strategy**

Using `upsert` ensures:
- Exactly one assessment per incident
- Re-analysis updates existing assessment
- No orphaned assessments

### 4. **Transaction Safety**

Incident and assessment are persisted together:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.incident.update({ severity: ... });
  await assessmentRepository.upsertAssessment({ ... });
});
```

### 5. **JSON for Complex Structures**

Rather than flattening into many columns, structured data is stored as JSON:
- Preserves complete context
- Flexible for future enhancements
- Enables rich querying capabilities

### 6. **Versioning for Evolution**

`assessmentVersion` field enables:
- Algorithm improvements without breaking old assessments
- A/B testing of scoring changes
- Historical analysis of algorithm performance
- Traceability of assessment logic

## Benefits

### For Development

- **Clean Architecture**: Repository pattern separates persistence from business logic
- **Testability**: Domain logic independent of database
- **Type Safety**: Strongly typed interfaces for all data structures
- **Maintainability**: Clear separation between operational and analytical data

### For Operations

- **Audit Trail**: Complete history of assessments
- **Analytics**: Rich data for reporting and insights
- **Debugging**: Full context available for investigation
- **Compliance**: Traceable decision-making process

### For Users

- **Transparency**: Understand why priorities were assigned
- **Trust**: See the data behind decisions
- **Accountability**: Clear reasoning for every assessment

## Example Usage

### Creating an Incident with Assessment

```typescript
// 1. Gather analysis data
const aiAnalysis = await geminiService.analyzeIllegalDump(...);
const locationContext = await overpassService.analyzeLocation(...);
const historicalContext = await historyService.getHistoricalContext(...);

// 2. Create incident
const incident = await prisma.incident.create({ ... });

// 3. Perform assessment
const assessment = await assessmentService.performAssessment(
  incident,
  aiAnalysis,
  locationContext,
  historicalContext
);

// 4. Prepare persistence data
const persistenceData = assessmentService.preparePersistenceData(
  incident.id,
  assessment,
  aiAnalysis,
  locationContext,
  historicalContext
);

// 5. Persist in transaction
await prisma.$transaction(async (tx) => {
  await tx.incident.update({ 
    where: { id: incident.id },
    data: { severity: persistenceData.priority }
  });
  await assessmentRepository.upsertAssessment(persistenceData);
});
```

### Querying Assessments

```typescript
// Get assessment for an incident
const assessment = await assessmentRepository.findByIncidentId(incidentId);

// Get all critical assessments
const critical = await assessmentRepository.findByPriority('CRITICAL');

// Get statistics
const stats = await assessmentRepository.getStatistics();
// { total: 150, byPriority: { CRITICAL: 12, HIGH: 45, ... }, averageScore: 62.3 }
```

## Migration

The migration `20260721232655_add_incident_assessment` performs:

1. Create `incident_assessments` table
2. Remove `ai_confidence` column from `incidents`
3. Remove `ai_recommendation` column from `incidents`
4. Add unique index on `incident_assessments.incident_id`
5. Add foreign key constraint with CASCADE on delete

## Testing

Test incidents created:

- **CRITICAL** (Score: 100): Hazardous waste near school with waterways
- **MEDIUM** (Score: 30): Small household trash in low-density area

Both assessments persisted successfully with full context data.

## Future Enhancements

### Versioned Assessments

Store multiple assessments per incident for complete history:

```typescript
model IncidentAssessmentHistory {
  id           String
  incidentId   String
  version      Int
  assessment   Json
  createdAt    DateTime
  
  @@unique([incidentId, version])
}
```

### Assessment Comparison

Compare assessments before/after algorithm changes:

```typescript
interface AssessmentComparison {
  incidentId: string;
  oldScore: number;
  newScore: number;
  priorityChanged: boolean;
  scoreDeltat: number;
}
```

### ML Training Data Export

Export assessments for machine learning:

```typescript
interface TrainingDataExport {
  incidentId: string;
  features: {
    visual: VisualAnalysis;
    location: LocationContext;
    historical: HistoricalContext;
  };
  label: {
    priority: string;
    score: number;
  };
}
```

## Status

✅ **Implemented and Tested**
- Schema migration applied
- Repository layer created
- Transaction-based persistence
- Full context preservation
- Version tracking (1.0.0)
- Logging and error handling

## Related Documentation

- `README.md` - Assessment engine overview
- `ARCHITECTURE.md` - System architecture
- `scoring/` - Individual scorer implementations
