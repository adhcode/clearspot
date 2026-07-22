import { IncidentSeverity } from '@prisma/client';

/**
 * Nearby feature in location context
 */
export interface NearbyFeatureDto {
  name?: string;
  distanceInMeters: number;
}

/**
 * Location intelligence data
 * Processed geographic context from Overpass API
 */
export interface LocationIntelligenceDto {
  schools: NearbyFeatureDto[];
  hospitals: NearbyFeatureDto[];
  clinics: NearbyFeatureDto[];
  markets: NearbyFeatureDto[];
  busStops: NearbyFeatureDto[];
  primaryRoads: NearbyFeatureDto[];
  trunkRoads: NearbyFeatureDto[];
  waterways: NearbyFeatureDto[];
  sourceStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL';
}

/**
 * Visual analysis data from AI
 */
export interface VisualAnalysisDto {
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
 * Historical context data
 */
export interface HistoricalContextDto {
  nearbyReportsCount: number;
  unresolvedIncidentsCount: number;
  isRecurringHotspot: boolean;
  averageResolutionHours: number | null;
  previousReportsLast30Days: number;
}

/**
 * Complete assessment response for frontend
 * Never exposes Prisma models directly
 */
export class AssessmentResponseDto {
  id: string;
  incidentId: string;
  score: number;
  priority: IncidentSeverity;
  estimatedCleanupCost: number;
  aiConfidence: number | null;
  reasons: string[];
  recommendations: string[];
  visualAnalysis: VisualAnalysisDto | null;
  locationIntelligence: LocationIntelligenceDto;
  historicalContext: HistoricalContextDto;
  assessmentVersion: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    incidentId: string;
    score: number;
    priority: IncidentSeverity;
    estimatedCleanupCost: number;
    aiConfidence: number | null;
    reasons: string[];
    recommendations: string[];
    visualAnalysis: any;
    locationContext: any;
    historicalContext: any;
    assessmentVersion: string;
    generatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.incidentId = data.incidentId;
    this.score = data.score;
    this.priority = data.priority;
    this.estimatedCleanupCost = Number(data.estimatedCleanupCost);
    this.aiConfidence = data.aiConfidence;
    this.reasons = data.reasons;
    this.recommendations = data.recommendations;
    this.visualAnalysis = data.visualAnalysis as VisualAnalysisDto | null;
    this.locationIntelligence = data.locationContext as LocationIntelligenceDto;
    this.historicalContext = data.historicalContext as HistoricalContextDto;
    this.assessmentVersion = data.assessmentVersion;
    this.generatedAt = data.generatedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
