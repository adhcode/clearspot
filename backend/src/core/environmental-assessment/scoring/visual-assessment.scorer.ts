import { Injectable } from '@nestjs/common';
import { AssessmentScore, GeminiAnalysis, VisualIndicators } from '../types/assessment.types';
import { VISUAL_WEIGHTS } from '../constants/scoring-weights.constants';

@Injectable()
export class VisualAssessmentScorer {
  score(aiAnalysis: GeminiAnalysis): AssessmentScore {
    let score = 0;
    const reasons: string[] = [];

    // Illegal dump detection
    if (aiAnalysis.isIllegalDump) {
      score += VISUAL_WEIGHTS.ILLEGAL_DUMP_DETECTED;
      reasons.push('Illegal waste dumping detected');
    }

    // Hazardous materials
    if (this.isHazardousWaste(aiAnalysis.wasteType)) {
      score += VISUAL_WEIGHTS.HAZARDOUS_WASTE;
      reasons.push(`Hazardous materials identified: ${aiAnalysis.wasteType}`);
    }

    // Waste pile size
    const sizeScore = this.scoreWasteSize(aiAnalysis.estimatedSize);
    if (sizeScore.score > 0) {
      score += sizeScore.score;
      reasons.push(sizeScore.reason);
    }

    // Visual indicators from AI reasoning
    const indicators = this.extractVisualIndicators(aiAnalysis.reasoning);
    const indicatorScore = this.scoreVisualIndicators(indicators);
    score += indicatorScore.score;
    reasons.push(...indicatorScore.reasons);

    return { score, reasons };
  }

  private isHazardousWaste(wasteType: string): boolean {
    return wasteType === 'Toxic/Hazardous' || wasteType === 'Industrial Waste';
  }

  private scoreWasteSize(size: string): { score: number; reason: string } {
    switch (size) {
      case 'Very Large':
        return {
          score: VISUAL_WEIGHTS.VERY_LARGE_WASTE_PILE,
          reason: 'Very large waste pile requiring significant cleanup effort',
        };
      case 'Large':
        return {
          score: VISUAL_WEIGHTS.LARGE_WASTE_PILE,
          reason: 'Large waste pile detected',
        };
      case 'Medium':
        return {
          score: 10,
          reason: 'Medium-sized waste accumulation',
        };
      case 'Small':
        return {
          score: 0,
          reason: '',
        };
      default:
        return { score: 0, reason: '' };
    }
  }

  private extractVisualIndicators(reasoning: string): VisualIndicators {
    const lowerReasoning = reasoning.toLowerCase();

    return {
      hasHazardousMaterials:
        lowerReasoning.includes('hazard') ||
        lowerReasoning.includes('toxic') ||
        lowerReasoning.includes('chemical'),
      hasRoadObstruction:
        lowerReasoning.includes('road') &&
        (lowerReasoning.includes('block') || lowerReasoning.includes('obstruct')),
      hasDrainageObstruction:
        lowerReasoning.includes('drain') &&
        (lowerReasoning.includes('block') || lowerReasoning.includes('clog')),
      hasSmoke: lowerReasoning.includes('smoke'),
      hasFire: lowerReasoning.includes('fire') || lowerReasoning.includes('burning'),
      hasStandingWater:
        lowerReasoning.includes('water') &&
        (lowerReasoning.includes('standing') || lowerReasoning.includes('stagnant')),
    };
  }

  private scoreVisualIndicators(indicators: VisualIndicators): AssessmentScore {
    let score = 0;
    const reasons: string[] = [];

    if (indicators.hasFire) {
      score += VISUAL_WEIGHTS.FIRE_DETECTED;
      reasons.push('Active fire detected - immediate hazard');
    }

    if (indicators.hasSmoke) {
      score += VISUAL_WEIGHTS.SMOKE_DETECTED;
      reasons.push('Smoke detected - air quality concern');
    }

    if (indicators.hasRoadObstruction) {
      score += VISUAL_WEIGHTS.ROAD_OBSTRUCTION;
      reasons.push('Blocking road access');
    }

    if (indicators.hasDrainageObstruction) {
      score += VISUAL_WEIGHTS.DRAINAGE_OBSTRUCTION;
      reasons.push('Obstructing drainage system');
    }

    if (indicators.hasStandingWater) {
      score += VISUAL_WEIGHTS.STANDING_WATER;
      reasons.push('Standing water present - potential breeding ground for vectors');
    }

    return { score, reasons };
  }
}
