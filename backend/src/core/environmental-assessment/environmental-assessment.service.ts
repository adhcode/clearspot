import { Injectable, Logger } from '@nestjs/common';
import { Incident, IncidentSeverity } from '@prisma/client';
import { LocationContext } from '@integrations/maps/types/location-context.types';
import {
  EnvironmentalAssessment,
  GeminiAnalysis,
  HistoricalContext,
  Priority,
} from './types/assessment.types';
import {
  AssessmentPersistenceData,
  PersistedVisualAnalysis,
  PersistedLocationContext,
  PersistedHistoricalContext,
} from './types/persisted-assessment.types';
import { VisualAssessmentScorer } from './scoring/visual-assessment.scorer';
import { LocationAssessmentScorer } from './scoring/location-assessment.scorer';
import { HistoricalAssessmentScorer } from './scoring/historical-assessment.scorer';
import { RecommendationGenerator } from './scoring/recommendation.generator';
import { PRIORITY_THRESHOLDS, MAX_SCORE } from './constants/scoring-weights.constants';

const ASSESSMENT_VERSION = '1.0.0';

@Injectable()
export class EnvironmentalAssessmentService {
  private readonly logger = new Logger(EnvironmentalAssessmentService.name);

  constructor(
    private visualScorer: VisualAssessmentScorer,
    private locationScorer: LocationAssessmentScorer,
    private historicalScorer: HistoricalAssessmentScorer,
    private recommendationGenerator: RecommendationGenerator,
  ) {}

  async performAssessment(
    incident: Incident,
    aiAnalysis: GeminiAnalysis | null,
    locationContext: LocationContext,
    historicalContext: HistoricalContext,
  ): Promise<EnvironmentalAssessment> {
    const startTime = Date.now();

    this.logger.log(
      `Starting environmental assessment for incident ${incident.id} at ${incident.latitude},${incident.longitude}`,
    );

    // Execute assessment pipeline
    const visualScore = aiAnalysis
      ? this.visualScorer.score(aiAnalysis)
      : { score: 0, reasons: ['AI analysis unavailable - manual review recommended'] };

    const locationScore = this.locationScorer.score(locationContext);
    const historicalScore = this.historicalScorer.score(historicalContext);

    // Combine scores
    const totalScore = Math.min(
      visualScore.score + locationScore.score + historicalScore.score,
      MAX_SCORE,
    );

    // Determine priority from score
    const priority = this.calculatePriority(totalScore);

    // Combine all reasons
    const reasons = [
      ...this.formatReasons('Visual Assessment', visualScore.reasons),
      ...this.formatReasons('Location Analysis', locationScore.reasons),
      ...this.formatReasons('Historical Context', historicalScore.reasons),
    ];

    // Determine if hazardous materials are present
    const hasHazardousMaterials =
      aiAnalysis?.wasteType === 'Toxic/Hazardous' ||
      aiAnalysis?.wasteType === 'Industrial Waste' ||
      false;

    // Generate recommendations
    const recommendations = this.recommendationGenerator.generate(
      priority,
      totalScore,
      hasHazardousMaterials,
    );

    // Estimate cleanup cost
    const estimatedCleanupCost = this.estimateCleanupCost(
      aiAnalysis,
      priority,
      locationContext,
    );

    const assessment: EnvironmentalAssessment = {
      score: totalScore,
      priority,
      estimatedCleanupCost,
      reasons: this.deduplicateReasons(reasons),
      recommendations,
      generatedAt: new Date(),
    };

    const latency = Date.now() - startTime;
    this.logger.log(
      `Assessment completed for incident ${incident.id} - Score: ${totalScore}, Priority: ${priority}, Latency: ${latency}ms`,
    );

    return assessment;
  }

  /**
   * Prepare assessment data for persistence
   * Transforms domain objects into persistence-ready format
   */
  preparePersistenceData(
    incidentId: string,
    assessment: EnvironmentalAssessment,
    aiAnalysis: GeminiAnalysis | null,
    locationContext: LocationContext,
    historicalContext: HistoricalContext,
  ): AssessmentPersistenceData {
    return {
      incidentId,
      score: assessment.score,
      priority: this.mapPriorityToSeverity(assessment.priority),
      estimatedCleanupCost: assessment.estimatedCleanupCost,
      aiConfidence: aiAnalysis?.confidence || null,
      reasons: assessment.reasons,
      recommendations: assessment.recommendations,
      visualAnalysis: aiAnalysis ? this.transformVisualAnalysis(aiAnalysis) : null,
      locationContext: this.transformLocationContext(locationContext),
      historicalContext: this.transformHistoricalContext(historicalContext),
      assessmentVersion: ASSESSMENT_VERSION,
      generatedAt: assessment.generatedAt,
    };
  }

  private transformVisualAnalysis(aiAnalysis: GeminiAnalysis): PersistedVisualAnalysis {
    return {
      wasteType: aiAnalysis.wasteType,
      estimatedSize: aiAnalysis.estimatedSize,
      hazardous: aiAnalysis.wasteType === 'Toxic/Hazardous' || aiAnalysis.wasteType === 'Industrial Waste',
      isIllegalDump: aiAnalysis.isIllegalDump,
      roadBlocked: false, // TODO: Extract from AI analysis when available
      drainageBlocked: false, // TODO: Extract from AI analysis when available
      fireDetected: false, // TODO: Extract from AI analysis when available
      smokeDetected: false, // TODO: Extract from AI analysis when available
      standingWater: false, // TODO: Extract from AI analysis when available
    };
  }

  private transformLocationContext(locationContext: LocationContext): PersistedLocationContext {
    // Determine source status based on whether any data was retrieved
    const totalFeatures =
      locationContext.schools.length +
      locationContext.hospitals.length +
      locationContext.clinics.length +
      locationContext.markets.length +
      locationContext.busStops.length +
      locationContext.primaryRoads.length +
      locationContext.trunkRoads.length +
      locationContext.waterways.length;

    const sourceStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL' =
      totalFeatures === 0 ? 'FAILED' : totalFeatures < 3 ? 'PARTIAL' : 'SUCCESS';

    return {
      schools: locationContext.schools.map((s) => ({
        name: s.name,
        distanceInMeters: s.distanceInMeters,
      })),
      hospitals: locationContext.hospitals.map((h) => ({
        name: h.name,
        distanceInMeters: h.distanceInMeters,
      })),
      clinics: locationContext.clinics.map((c) => ({
        name: c.name,
        distanceInMeters: c.distanceInMeters,
      })),
      markets: locationContext.markets.map((m) => ({
        name: m.name,
        distanceInMeters: m.distanceInMeters,
      })),
      busStops: locationContext.busStops.map((b) => ({
        name: b.name,
        distanceInMeters: b.distanceInMeters,
      })),
      primaryRoads: locationContext.primaryRoads.map((r) => ({
        name: r.name,
        distanceInMeters: r.distanceInMeters,
      })),
      trunkRoads: locationContext.trunkRoads.map((r) => ({
        name: r.name,
        distanceInMeters: r.distanceInMeters,
      })),
      waterways: locationContext.waterways.map((w) => ({
        name: w.name,
        distanceInMeters: w.distanceInMeters,
      })),
      sourceStatus,
    };
  }

  private transformHistoricalContext(
    historicalContext: HistoricalContext,
  ): PersistedHistoricalContext {
    return {
      nearbyReportsCount: historicalContext.nearbyReportsCount,
      unresolvedIncidentsCount: historicalContext.unresolvedIncidentsCount,
      isRecurringHotspot: historicalContext.isRecurringHotspot,
      averageResolutionHours: historicalContext.averageResolutionTimeHours,
      previousReportsLast30Days: historicalContext.nearbyReportsCount, // Using nearbyReportsCount as proxy
    };
  }

  private mapPriorityToSeverity(priority: Priority): IncidentSeverity {
    const mapping: Record<Priority, IncidentSeverity> = {
      LOW: IncidentSeverity.LOW,
      MEDIUM: IncidentSeverity.MEDIUM,
      HIGH: IncidentSeverity.HIGH,
      CRITICAL: IncidentSeverity.CRITICAL,
    };

    return mapping[priority];
  }

  private calculatePriority(score: number): Priority {
    if (score >= PRIORITY_THRESHOLDS.CRITICAL.min) {
      return 'CRITICAL';
    }
    if (score >= PRIORITY_THRESHOLDS.HIGH.min) {
      return 'HIGH';
    }
    if (score >= PRIORITY_THRESHOLDS.MEDIUM.min) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private formatReasons(_category: string, reasons: string[]): string[] {
    if (reasons.length === 0) {
      return [];
    }

    // Don't prepend category if there's only one reason and it's informational
    if (reasons.length === 1 && !this.isSignificantReason(reasons[0])) {
      return reasons;
    }

    return reasons;
  }

  private isSignificantReason(reason: string): boolean {
    const insignificantPhrases = [
      'unavailable',
      'previous report',
      'previous successful',
    ];
    return !insignificantPhrases.some((phrase) => reason.toLowerCase().includes(phrase));
  }

  private deduplicateReasons(reasons: string[]): string[] {
    return Array.from(new Set(reasons));
  }

  private estimateCleanupCost(
    aiAnalysis: GeminiAnalysis | null,
    priority: Priority,
    locationContext: LocationContext,
  ): number {
    // Start with AI estimate if available
    let baseCost = aiAnalysis?.estimatedCleanupCost || 25000;

    // Adjust based on priority
    const priorityMultipliers: Record<Priority, number> = {
      LOW: 0.8,
      MEDIUM: 1.0,
      HIGH: 1.3,
      CRITICAL: 1.6,
    };

    baseCost *= priorityMultipliers[priority];

    // Adjust for accessibility (near roads = easier access = lower cost)
    const hasNearbyRoad = locationContext.primaryRoads.some((r) => r.distanceInMeters < 200);
    if (!hasNearbyRoad) {
      baseCost *= 1.2; // Harder to access
    }

    // Round to nearest 1000
    return Math.round(baseCost / 1000) * 1000;
  }
}
