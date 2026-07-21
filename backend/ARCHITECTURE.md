# ClearSpot Backend Architecture

## Overview

Production-ready NestJS backend for illegal waste dump reporting and environmental assessment in Lagos, Nigeria.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ClearSpot Backend API                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Presentation Layer                           │  │
│  │  - AuthController                                         │  │
│  │  - IncidentsController                                    │  │
│  │  - StorageController                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Application Layer                            │  │
│  │  - AuthService                                           │  │
│  │  - IncidentsService (Orchestrator)                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Domain Layer (Core)                          │  │
│  │  - EnvironmentalAssessmentService (Orchestrator)         │  │
│  │    ├── VisualAssessmentScorer                           │  │
│  │    ├── LocationAssessmentScorer                         │  │
│  │    ├── HistoricalAssessmentScorer                       │  │
│  │    └── RecommendationGenerator                          │  │
│  │  - IncidentHistoryService                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Integration Layer                            │  │
│  │  - GeminiService → Google Gemini AI                      │  │
│  │  - OverpassService → OpenStreetMap                       │  │
│  │  - StorageService → Cloudflare R2                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Infrastructure Layer                         │  │
│  │  - PrismaService → PostgreSQL (Neon)                     │  │
│  │  - ConfigService → Environment Variables                  │  │
│  │  - Logger (Pino)                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Environmental Assessment Engine

**Purpose**: Orchestrates multi-source data to produce explainable environmental assessments.

**Pipeline**:
```
Incident Report
    ↓
AI Visual Analysis (Gemini) ───┐
                                ├──→ VisualAssessmentScorer
Geographic Context (Overpass) ─┤
                                ├──→ LocationAssessmentScorer
Historical Data (Database) ────┤
                                └──→ HistoricalAssessmentScorer
                                         ↓
                                   Score Aggregation (0-100)
                                         ↓
                                   Priority Determination
                                         ↓
                                   RecommendationGenerator
                                         ↓
                                   Environmental Assessment
```

**Key Principle**: **AI assists, Engine decides**
- AI provides visual analysis recommendations
- Geographic data provides proximity context
- Historical data shows patterns
- **The Engine makes the final priority decision** based on deterministic scoring

### 2. Incident Creation Flow

```typescript
1. Citizen submits incident (no auth required)
   ↓
2. AI analyzes images/description (Gemini)
   ↓
3. Geographic context retrieved (Overpass)
   ↓
4. Historical patterns analyzed (Database)
   ↓
5. Incident record created (REPORTED status)
   ↓
6. Environmental assessment performed
   ↓
7. Incident updated with assessment results
   ↓
8. Citizen receives confirmation
```

### 3. Authentication Strategy

**Citizen-First Approach**: No auth required for reporting

```
Anonymous Report → Optional Email/Phone → Guest Account → Full Account
```

- Citizens can report without signup
- Optional: Provide email/phone for updates
- Later: Claim guest reports when creating account
- Officers/Vendors: JWT authentication required

## Module Structure

```
backend/src/
├── common/                     # Shared utilities
│   ├── decorators/
│   ├── dto/
│   ├── exceptions/
│   ├── guards/
│   ├── interceptors/
│   ├── types/
│   └── utils/
│
├── config/                     # Configuration
│   └── env.validation.ts
│
├── core/                       # Domain logic
│   └── environmental-assessment/
│       ├── scoring/            # Assessment scorers
│       ├── services/           # Domain services
│       ├── constants/          # Business rules
│       ├── types/              # Domain types
│       └── environmental-assessment.service.ts
│
├── database/                   # Database layer
│   ├── prisma.service.ts
│   └── database.module.ts
│
├── integrations/               # External services
│   ├── gemini/                 # AI analysis
│   ├── maps/                   # Geographic data
│   ├── storage/                # File storage
│   └── monnify/                # Payments (future)
│
└── modules/                    # Application features
    ├── auth/                   # Authentication
    ├── incidents/              # Incident management
    ├── analytics/              # Analytics (future)
    ├── contributions/          # Crowdfunding (future)
    ├── payments/               # Payment processing (future)
    ├── users/                  # User management (future)
    └── vendors/                # Vendor management (future)
```

## Data Flow

### Incident Creation

```
POST /api/v1/incidents
    ├─→ IncidentsService.create()
    │   ├─→ GeminiService.analyzeIllegalDump()
    │   │       └─→ Returns: AI analysis
    │   │
    │   ├─→ OverpassService.analyzeLocation()
    │   │       └─→ Returns: LocationContext
    │   │
    │   ├─→ IncidentHistoryService.getHistoricalContext()
    │   │       └─→ Returns: HistoricalContext
    │   │
    │   ├─→ PrismaService.incident.create()
    │   │       └─→ Returns: Incident record
    │   │
    │   ├─→ EnvironmentalAssessmentService.performAssessment()
    │   │   ├─→ VisualAssessmentScorer.score()
    │   │   ├─→ LocationAssessmentScorer.score()
    │   │   ├─→ HistoricalAssessmentScorer.score()
    │   │   ├─→ Calculate total score & priority
    │   │   └─→ RecommendationGenerator.generate()
    │   │       └─→ Returns: EnvironmentalAssessment
    │   │
    │   └─→ PrismaService.incident.update()
    │           └─→ Returns: Updated incident with assessment
    │
    └─→ HTTP 201 Created
```

## Scoring System

### Score Ranges

| Score | Priority | Response Time | Example |
|-------|----------|---------------|---------|
| 0-29 | LOW | Routine | Small household trash |
| 30-59 | MEDIUM | 48-72 hours | Medium construction debris |
| 60-79 | HIGH | 24 hours | Large pile near market |
| 80-100 | CRITICAL | 6 hours | Toxic waste near school |

### Scoring Components

**Visual Assessment** (max ~70 points)
- Illegal dump detection: +20
- Hazardous materials: +25
- Waste pile size: +10 to +30
- Obstructions/hazards: +10 to +30

**Location Assessment** (max ~60 points)
- Proximity to schools, hospitals, clinics
- Proximity to waterways (contamination risk)
- Proximity to markets, bus stops (high traffic)
- Proximity to major roads (accessibility)

**Historical Assessment** (max ~45 points)
- Nearby report frequency: +15 to +20
- Unresolved incidents: +10
- Recurring hotspot: +10
- Slow resolution history: +5

**Total**: Capped at 100 points

## Technology Stack

- **Framework**: NestJS 10.x with TypeScript (strict mode)
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Prisma
- **Authentication**: JWT with Passport
- **Logging**: Pino (structured logging)
- **Validation**: class-validator + class-transformer
- **Rate Limiting**: @nestjs/throttler
- **File Storage**: Cloudflare R2 (S3-compatible)
- **AI**: Google Gemini (gemini-flash-latest)
- **Maps**: OpenStreetMap Overpass API

## Design Principles

### 1. Clean Architecture
- Clear separation of concerns
- Domain logic isolated in `core/`
- Dependencies point inward
- Infrastructure at edges

### 2. SOLID Principles
- Single Responsibility: Each scorer does one thing
- Open/Closed: Extend behavior without modifying
- Liskov Substitution: Scorers are interchangeable
- Interface Segregation: Focused interfaces
- Dependency Inversion: Depend on abstractions

### 3. Fail-Safe Design
- Graceful degradation (AI/Maps failures don't block)
- Default fallbacks (MEDIUM severity if assessment fails)
- Comprehensive error handling
- Structured logging for debugging

### 4. Explainability
- Every score has a reason
- Human-readable explanations
- Transparent decision process
- Audit trail in logs

### 5. Testability
- Dependency injection everywhere
- Mock-friendly architecture
- Unit tests for scorers
- Integration tests for flows

## Security

- **Input Validation**: All DTOs validated
- **Authentication**: JWT for officers/vendors
- **Authorization**: Role-based guards
- **Rate Limiting**: Throttler on all endpoints
- **SQL Injection**: Prisma parameterized queries
- **XSS**: Automatic sanitization
- **Secrets**: Environment variables only
- **File Upload**: Presigned URLs (no server upload)

## Performance

- **Caching**: Ready for Redis integration
- **Database**: Connection pooling via Prisma
- **Parallel Execution**: AI, Maps, History run concurrently
- **Timeouts**: 30s for external APIs
- **Retry Logic**: Single retry for transient failures
- **Pagination**: All list endpoints paginated

## Deployment

**Environment**: Production-ready configuration

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
R2_ACCOUNT_ID=...
# ... other env vars
```

**Dockerfile**: Optimized multi-stage build
**Docker Compose**: PostgreSQL + Redis for local dev

## Future Enhancements

1. **Real-time Updates**: WebSocket for incident status
2. **Crowdfunding**: Citizen contributions for cleanup
3. **Vendor Management**: Cleanup crew assignments
4. **Analytics Dashboard**: Hotspot visualization
5. **Mobile App**: React Native integration
6. **SMS Notifications**: Twilio integration
7. **Payment Gateway**: Monnify integration
8. **Image Recognition**: Enhanced AI with image analysis
9. **Gamification**: Citizen engagement rewards
10. **API Versioning**: v2 endpoints for breaking changes

## Monitoring & Observability

- **Structured Logging**: Pino JSON logs
- **Request ID**: Every request tracked
- **Latency Tracking**: Performance metrics
- **Error Tracking**: Comprehensive error logs
- **Health Checks**: `/health` endpoint (future)
- **Metrics**: Prometheus-ready (future)

## API Documentation

- **OpenAPI/Swagger**: Auto-generated docs (future)
- **Postman Collection**: API examples (future)
- **Testing Guide**: `TESTING.md`
- **Getting Started**: `GETTING_STARTED.md`

## Contributing

See module-specific README files:
- `src/core/environmental-assessment/README.md`
- `src/integrations/maps/MAPS.md`
- `src/integrations/gemini/GEMINI.md`
- `src/integrations/storage/STORAGE.md`

## Status

✅ **Phase 1 Complete**: Core incident reporting + assessment
- Auth module (citizen-first approach)
- Incidents module (CRUD + review)
- Environmental Assessment Engine
- AI integration (Gemini)
- Maps integration (Overpass)
- Storage integration (Cloudflare R2)

🚧 **Phase 2 In Progress**: User management + vendors
⏳ **Phase 3 Planned**: Crowdfunding + payments
⏳ **Phase 4 Planned**: Analytics + dashboard
