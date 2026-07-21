import { Injectable } from '@nestjs/common';
import { AssessmentScore, HistoricalContext } from '../types/assessment.types';
import { HISTORICAL_WEIGHTS } from '../constants/scoring-weights.constants';

@Injectable()
export class HistoricalAssessmentScorer {
  score(historicalContext: HistoricalContext): AssessmentScore {
    let score = 0;
    const reasons: string[] = [];

    // Assess nearby reports
    const nearbyReportsScore = this.scoreNearbyReports(historicalContext.nearbyReportsCount);
    score += nearbyReportsScore.score;
    if (nearbyReportsScore.reason) {
      reasons.push(nearbyReportsScore.reason);
    }

    // Assess unresolved incidents
    if (historicalContext.unresolvedIncidentsCount > 0) {
      score += HISTORICAL_WEIGHTS.UNRESOLVED_INCIDENTS_NEARBY;
      reasons.push(
        `${historicalContext.unresolvedIncidentsCount} unresolved incident(s) in this area`,
      );
    }

    // Assess recurring hotspot
    if (historicalContext.isRecurringHotspot) {
      score += HISTORICAL_WEIGHTS.RECURRING_HOTSPOT;
      reasons.push('Identified as recurring illegal dumping hotspot');
    }

    // Assess resolution history
    if (
      historicalContext.averageResolutionTimeHours !== null &&
      historicalContext.averageResolutionTimeHours > 72
    ) {
      score += HISTORICAL_WEIGHTS.SLOW_RESOLUTION_HISTORY;
      const days = Math.round(historicalContext.averageResolutionTimeHours / 24);
      reasons.push(`Historical cleanup delays in area (avg. ${days} days)`);
    }

    // Add positive context for areas with good cleanup history
    if (
      historicalContext.previousCleanupsCount > 0 &&
      historicalContext.unresolvedIncidentsCount === 0 &&
      !historicalContext.isRecurringHotspot
    ) {
      reasons.push(
        `${historicalContext.previousCleanupsCount} previous successful cleanup(s) in area`,
      );
    }

    return { score, reasons };
  }

  private scoreNearbyReports(count: number): { score: number; reason: string } {
    if (count >= 5) {
      return {
        score: HISTORICAL_WEIGHTS.FIVE_OR_MORE_NEARBY_REPORTS,
        reason: `${count} similar reports in vicinity - high activity area`,
      };
    }

    if (count >= 3) {
      return {
        score: HISTORICAL_WEIGHTS.THREE_OR_MORE_NEARBY_REPORTS,
        reason: `${count} similar reports nearby`,
      };
    }

    if (count > 0) {
      return {
        score: 0,
        reason: `${count} previous report(s) in area`,
      };
    }

    return { score: 0, reason: '' };
  }
}
