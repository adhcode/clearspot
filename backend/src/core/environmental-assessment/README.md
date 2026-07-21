# Environmental Assessment Engine

Production-grade environmental assessment orchestration service for illegal dump site evaluation.

## Purpose

The Environmental Assessment Engine combines multiple data sources to produce an **explainable, deterministic** environmental assessment for each reported incident:

- ✅ AI visual analysis (Gemini)
- ✅ Geographic context (OpenStreetMap)
- ✅ Historical incident data
- ✅ Business rules

**Critical Principle**: The AI provides recommendations, but the Environmental Assessment Engine makes the final priority decision.

## Architecture

```
EnvironmentalAssessmentService (Orchestrator)
├── VisualAssessmentScorer          # AI analysis scoring
├── LocationAssessmentScorer        # Geographic proximity scoring
├── HistoricalAssessmentScorer      # Historical pattern scoring
├── RecommendationGenerator         # Action recommendations
└── IncidentHistoryService          # Historical data provider
```

## Assessment Pipeline

```
Incident Report
    │
    ├─→ Gemini Analysis
    │       │
    │       ▼
    │   VisualAssessmentScorer
    │       │
    ├─→ LocationContext
    │       │
    │       ▼
    │   LocationAssessmentScorer
    │       │
    ├─→ HistoricalContext
    │       │
    │       ▼
    │   HistoricalAssessmentScorer
    │       │
    │       ▼
    │   Score Aggregation
    │       │
    │       ▼
    │   Priority Determination
    │       │
    │       ▼
    │   RecommendationGenerator
    │       │
    │       ▼
    EnvironmentalAssessment
```

## Service Interface

### Main Method

```typescript
async performAssessment(
  incident: Incident,
  aiAnalysis: GeminiAnalysis | null,
  locationContext: LocationContext,
  historicalContext: HistoricalContext
): Promise<EnvironmentalAssessment>
```

### Output

```typescript
interface EnvironmentalAssessment {
  score: number;                          // 0-100
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCleanupCost: number;          // in Naira
  reasons: string[];                      // Human-readable explanations
  recommendations: string[];              // Action items
  generatedAt: Date;
}
```

## Scoring System

### Visual Assessment (Max ~70 points)

| Factor | Points | Description |
|--------|--------|-------------|
| Illegal dump detected | +20 | Basic detection |
| Hazardous waste | +25 | Toxic/industrial materials |
| Large waste pile | +20 | Significant volume |
| Very large pile | +30 | Massive accumulation |
| Road obstruction | +15 | Blocking traffic |
| Drainage obstruction | +15 | Blocking water flow |
| Fire detected | +30 | Active fire hazard |
| Smoke detected | +20 | Air quality concern |
| Standing water | +10 | Vector breeding |

### Location Assessment (Max ~60 points)

| Proximity | Points | Threshold |
|-----------|--------|-----------|
| School | +20 | Within 250m |
| School | +15 | Within 500m |
| School | +10 | Within 1km |
| Hospital | +15 | Within 500m |
| Hospital | +10 | Within 1km |
| Clinic | +12 | Within 500m |
| Market | +15 | Within 250m |
| Waterway | +15 | Within 250m |
| Major road | +10 | Within 100m |
| Bus stop | +8 | Within 200m |

### Historical Assessment (Max ~45 points)

| Factor | Points | Condition |
|--------|--------|-----------|
| Many reports | +20 | 5+ nearby reports |
| Multiple reports | +15 | 3+ nearby reports |
| Unresolved incidents | +10 | Open incidents nearby |
| Recurring hotspot | +10 | 3+ reports in 30 days |
| Slow resolution | +5 | Avg >72 hours |

### Priority Mapping

```
Score 0-29   → LOW
Score 30-59  → MEDIUM
Score 60-79  → HIGH
Score 80-100 → CRITICAL
```

Maximum total score: **100** (capped)

## Scorer Responsibilities

### VisualAssessmentScorer

**Input**: `GeminiAnalysis`

**Evaluates**:
- Illegal dumping detection
- Waste type classification
- Waste volume estimation
- Visual hazards (fire, smoke, obstruction)
- Environmental indicators

**Output**: Score + reasons

### LocationAssessmentScorer

**Input**: `LocationContext` (from OverpassService)

**Evaluates**:
- Proximity to sensitive locations
- Distance-based risk weighting
- Multiple nearby features
- Public safety impact

**Output**: Score + reasons

### HistoricalAssessmentScorer

**Input**: `HistoricalContext` (from IncidentHistoryService)

**Evaluates**:
- Report frequency patterns
- Unresolved incident density
- Cleanup success history
- Hotspot identification
- Resolution time trends

**Output**: Score + reasons

### RecommendationGenerator

**Input**: Priority + score + context

**Generates**:
- Deterministic action items
- Timeline recommendations
- Resource allocation guidance
- Public messaging

**Output**: Recommendations array

## Explainability

Every assessment produces human-readable reasons:

**Example Output**:
```json
{
  "score": 85,
  "priority": "CRITICAL",
  "reasons": [
    "Hazardous materials identified: Toxic/Hazardous",
    "Very large waste pile requiring significant cleanup effort",
    "Obstructing drainage system",
    "Located 180m from Test School (250m from school)",
    "Located 300m from Test River (waterway)",
    "5 similar reports in vicinity - high activity area",
    "Identified as recurring illegal dumping hotspot"
  ],
  "recommendations": [
    "⚠️ Immediate cleanup required within 6 hours",
    "Notify environmental authority immediately",
    "Deploy hazmat-certified cleanup crew",
    "Conduct soil and water contamination assessment",
    "Establish safety perimeter around affected area"
  ]
}
```

## Usage Example

```typescript
import { EnvironmentalAssessmentService } from '@core/environmental-assessment/environmental-assessment.service';
import { IncidentHistoryService } from '@core/environmental-assessment/services/incident-history.service';
import { GeminiService } from '@integrations/gemini/gemini.service';
import { OverpassService } from '@integrations/maps/overpass.service';

@Injectable()
export class IncidentsService {
  constructor(
    private assessmentService: EnvironmentalAssessmentService,
    private historyService: IncidentHistoryService,
    private geminiService: GeminiService,
    private overpassService: OverpassService,
  ) {}

  async createIncident(dto: CreateIncidentDto): Promise<Incident> {
    // 1. Get AI analysis
    const aiAnalysis = await this.geminiService.analyzeIllegalDump(
      dto.title,
      dto.description,
      dto.address,
      dto.imageUrls[0],
    );

    // 2. Get location context
    const locationContext = await this.overpassService.analyzeLocation(
      dto.latitude,
      dto.longitude,
    );

    // 3. Get historical context
    const historicalContext = await this.historyService.getHistoricalContext(
      dto.latitude,
      dto.longitude,
    );

    // 4. Create incident record
    const incident = await this.prisma.incident.create({
      data: { ...dto, status: 'REPORTED' },
    });

    // 5. Perform assessment
    const assessment = await this.assessmentService.performAssessment(
      incident,
      aiAnalysis,
      locationContext,
      historicalContext,
    );

    // 6. Update incident with assessment
    return this.prisma.incident.update({
      where: { id: incident.id },
      data: {
        severity: assessment.priority,
        estimatedCleanupCost: assessment.estimatedCleanupCost,
        assessmentReasons: assessment.reasons,
        recommendations: assessment.recommendations,
      },
    });
  }
}
```

## Key Principles

### 1. **AI Assists, Engine Decides**
The AI analysis is **one input** to the assessment. The final priority is determined by the scoring algorithm, not the AI.

### 2. **Deterministic Scoring**
Given the same inputs, the assessment produces identical outputs. No randomness, no non-deterministic AI decisions in scoring.

### 3. **Explainable Results**
Every point in the score has a corresponding human-readable reason. Citizens, officers, and vendors can understand why a priority was assigned.

### 4. **Separation of Concerns**
- Each scorer has one responsibility
- No scorer calls external APIs
- No scorer queries the database
- Dependencies are injected

### 5. **Testability**
Each scorer can be unit tested independently. The orchestrator can be tested with mocked scorers.

## Testing

```bash
# Unit tests
pnpm test environmental-assessment

# Run specific scorer tests
pnpm test visual-assessment.scorer
pnpm test location-assessment.scorer
pnpm test historical-assessment.scorer
```

## Configuration

Scoring weights are defined in:
```
constants/scoring-weights.constants.ts
```

Adjust weights to tune the assessment algorithm:

```typescript
export const LOCATION_WEIGHTS = {
  SCHOOL_WITHIN_250M: 20,  // Increase for higher school sensitivity
  WATERWAY_WITHIN_250M: 15,
  // ...
};
```

## Dependencies

```typescript
// Required imports
import { EnvironmentalAssessmentModule } from '@core/environmental-assessment/environmental-assessment.module';

@Module({
  imports: [EnvironmentalAssessmentModule],
  // ...
})
export class YourModule {}
```

The module automatically imports:
- DatabaseModule (for historical data)
- MapsModule (for location context)
- GeminiModule (for AI types)

## Status

✅ Implemented
✅ Tested
✅ Documented
✅ Ready for integration into IncidentsModule
