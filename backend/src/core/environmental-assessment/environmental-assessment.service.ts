import { Injectable, Logger } from '@nestjs/common';
import { Incident } from '@prisma/client';
import { LocationContext } from '@integrations/maps/types/location-context.types';
import {
  EnvironmentalAssessment,
  GeminiAnalysis,
  HistoricalContext,
  Priority,
} from './types/assessment.types';
import { VisualAssessmentScorer } from './scoring/visual-assessment.scorer';
import { LocationAssessmentScorer } from './scoring/location-assessment.scorer';
import { HistoricalAssessmentScorer } from './scoring/historical-assessment.scorer';
import { RecommendationGenerator } from './scoring/recommendation.generator';
import { PRIORITY_THRESHOLDS, MAX_SCORE } from './constants/scoring-weights.constants';

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
