import { IncidentStatus, IncidentSeverity } from '@prisma/client';

/**
 * Incident basic information for assessment view
 */
export interface IncidentInfoDto {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  reporter: {
    id: string;
    name: string;
  } | null;
}

/**
 * Assessment summary for frontend display
 */
export interface AssessmentSummaryDto {
  score: number;
  priority: IncidentSeverity;
  estimatedCleanupCost: number;
  confidence: number | null;
  reasons: string[];
  recommendations: string[];
  assessmentVersion: string;
  generatedAt: Date;
}

/**
 * Location intelligence summary
 * Aggregated counts and risk factors
 */
export interface LocationIntelligenceSummaryDto {
  nearbySchools: number;
  nearbyHospitals: number;
  nearbyClinics: number;
  nearbyMarkets: number;
  nearbyBusStops: number;
  nearbyWaterways: number;
  riskFactors: string[];
  sourceStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'UNKNOWN';
}

/**
 * Funding information
 */
export interface FundingInfoDto {
  totalRaised: number;
  targetAmount: number | null;
  contributorsCount: number;
  fundingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  fundingPercentage: number;
}

/**
 * Timeline event
 */
export interface TimelineEventDto {
  status: string;
  description: string;
  timestamp: Date;
  actor?: {
    id: string;
    name: string;
    role: string;
  };
}

/**
 * Complete incident assessment response
 * Single source of truth for assessment screen
 */
export class IncidentAssessmentResponse {
  incident: IncidentInfoDto;
  assessment: AssessmentSummaryDto | null;
  assessmentStatus: 'AVAILABLE' | 'PENDING' | 'FAILED';
  locationIntelligence: LocationIntelligenceSummaryDto | null;
  funding: FundingInfoDto;
  timeline: TimelineEventDto[];
  metadata: {
    hasAssessment: boolean;
    canEdit: boolean;
    canFund: boolean;
    lastUpdated: Date;
  };

  constructor(data: {
    incident: IncidentInfoDto;
    assessment: AssessmentSummaryDto | null;
    assessmentStatus: 'AVAILABLE' | 'PENDING' | 'FAILED';
    locationIntelligence: LocationIntelligenceSummaryDto | null;
    funding: FundingInfoDto;
    timeline: TimelineEventDto[];
    metadata: {
      hasAssessment: boolean;
      canEdit: boolean;
      canFund: boolean;
      lastUpdated: Date;
    };
  }) {
    this.incident = data.incident;
    this.assessment = data.assessment;
    this.assessmentStatus = data.assessmentStatus;
    this.locationIntelligence = data.locationIntelligence;
    this.funding = data.funding;
    this.timeline = data.timeline;
    this.metadata = data.metadata;
  }
}
