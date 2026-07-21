import { IncidentSeverity } from '@prisma/client';

/**
 * Visual analysis data structure for persistence
 * Processed output from Gemini AI
 */
export interface PersistedVisualAnalysis {
  wasteType: string;
  estimatedSize: string;
  hazardous: boolean;
  isIllegalDump: boolean;
  roadBlocked: boolean;
  drainageBlocked: boolean;
  fireDetected: boolean;
  smokeDetected: boolean;
  standingWater: boolean;
}

/**
 * Location context data structure for persistence
 * Processed output from Overpass API
 */
export interface PersistedLocationContext {
  schools: Array<{
    name?: string;
    distanceInMeters: number;
  }>;
  hospitals: Array<{
    name?: string;
    distanceInMeters: number;
  }>;
  clinics: Array<{
    name?: string;
    distanceInMeters: number;
  }>;
  markets: Array<{
    name?: string;
    distanceInMeters: number;
  }>;
  busStops: Array<{
    name?: string;
    distanceInMeters: number;
  }>;
  primaryRoads: Array<{
    name?: string;
    distanceInMeters: number;
  }>;
  trunkRoads: Array<{
    name?: string;
    distanceInMeters: number;
  }>;
  waterways: Array<{
    name?: string;
    distanceInMeters: number;
  }>;
}

/**
 * Historical context data structure for persistence
 * Aggregated historical data
 */
export interface PersistedHistoricalContext {
  nearbyReportsCount: number;
  unresolvedIncidentsCount: number;
  isRecurringHotspot: boolean;
  averageResolutionHours: number | null;
  previousReportsLast30Days: number;
}

/**
 * Complete assessment data for persistence
 */
export interface AssessmentPersistenceData {
  incidentId: string;
  score: number;
  priority: IncidentSeverity;
  estimatedCleanupCost: number;
  aiConfidence: number | null;
  reasons: string[];
  recommendations: string[];
  visualAnalysis: PersistedVisualAnalysis | null;
  locationContext: PersistedLocationContext;
  historicalContext: PersistedHistoricalContext;
  assessmentVersion: string;
  generatedAt: Date;
}
