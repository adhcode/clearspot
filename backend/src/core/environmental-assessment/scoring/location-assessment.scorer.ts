import { Injectable } from '@nestjs/common';
import { AssessmentScore } from '../types/assessment.types';
import { LocationContext, NearbyFeature } from '@integrations/maps/types/location-context.types';
import { LOCATION_WEIGHTS } from '../constants/scoring-weights.constants';

@Injectable()
export class LocationAssessmentScorer {
  score(locationContext: LocationContext): AssessmentScore {
    let score = 0;
    const reasons: string[] = [];

    // Assess schools proximity
    const schoolScore = this.assessProximity(
      locationContext.schools,
      [
        { distance: 250, weight: LOCATION_WEIGHTS.SCHOOL_WITHIN_250M, label: '250m from school' },
        { distance: 500, weight: LOCATION_WEIGHTS.SCHOOL_WITHIN_500M, label: '500m from school' },
        { distance: 1000, weight: LOCATION_WEIGHTS.SCHOOL_WITHIN_1KM, label: '1km from school' },
      ],
      'school',
    );
    score += schoolScore.score;
    reasons.push(...schoolScore.reasons);

    // Assess hospitals proximity
    const hospitalScore = this.assessProximity(
      locationContext.hospitals,
      [
        { distance: 500, weight: LOCATION_WEIGHTS.HOSPITAL_WITHIN_500M, label: '500m from hospital' },
        { distance: 1000, weight: LOCATION_WEIGHTS.HOSPITAL_WITHIN_1KM, label: '1km from hospital' },
      ],
      'hospital',
    );
    score += hospitalScore.score;
    reasons.push(...hospitalScore.reasons);

    // Assess clinics proximity
    const clinicScore = this.assessProximity(
      locationContext.clinics,
      [
        { distance: 500, weight: LOCATION_WEIGHTS.CLINIC_WITHIN_500M, label: '500m from clinic' },
        { distance: 1000, weight: LOCATION_WEIGHTS.CLINIC_WITHIN_1KM, label: '1km from clinic' },
      ],
      'clinic',
    );
    score += clinicScore.score;
    reasons.push(...clinicScore.reasons);

    // Assess markets proximity
    const marketScore = this.assessProximity(
      locationContext.markets,
      [
        { distance: 250, weight: LOCATION_WEIGHTS.MARKET_WITHIN_250M, label: '250m from market' },
        { distance: 500, weight: LOCATION_WEIGHTS.MARKET_WITHIN_500M, label: '500m from market' },
      ],
      'market',
    );
    score += marketScore.score;
    reasons.push(...marketScore.reasons);

    // Assess waterways proximity
    const waterwayScore = this.assessProximity(
      locationContext.waterways,
      [
        { distance: 250, weight: LOCATION_WEIGHTS.WATERWAY_WITHIN_250M, label: '250m from waterway' },
        { distance: 500, weight: LOCATION_WEIGHTS.WATERWAY_WITHIN_500M, label: '500m from waterway' },
      ],
      'waterway',
    );
    score += waterwayScore.score;
    reasons.push(...waterwayScore.reasons);

    // Assess major roads proximity
    const majorRoads = [...locationContext.primaryRoads, ...locationContext.trunkRoads];
    const roadScore = this.assessProximity(
      majorRoads,
      [
        { distance: 100, weight: LOCATION_WEIGHTS.MAJOR_ROAD_WITHIN_100M, label: '100m from major road' },
        { distance: 250, weight: LOCATION_WEIGHTS.MAJOR_ROAD_WITHIN_250M, label: '250m from major road' },
      ],
      'major road',
    );
    score += roadScore.score;
    reasons.push(...roadScore.reasons);

    // Assess bus stops proximity
    const busStopScore = this.assessProximity(
      locationContext.busStops,
      [
        { distance: 200, weight: LOCATION_WEIGHTS.BUS_STOP_WITHIN_200M, label: '200m from bus stop' },
      ],
      'bus stop',
    );
    score += busStopScore.score;
    reasons.push(...busStopScore.reasons);

    return { score, reasons };
  }

  private assessProximity(
    features: NearbyFeature[],
    thresholds: Array<{ distance: number; weight: number; label: string }>,
    featureType: string,
  ): AssessmentScore {
    let score = 0;
    const reasons: string[] = [];

    if (features.length === 0) {
      return { score: 0, reasons: [] };
    }

    // Get the nearest feature
    const nearest = features[0];

    // Find the highest scoring threshold that applies
    for (const threshold of thresholds) {
      if (nearest.distanceInMeters <= threshold.distance) {
        score = threshold.weight;
        const featureName = nearest.name || `unnamed ${featureType}`;
        reasons.push(
          `Located ${nearest.distanceInMeters}m from ${featureName} (${threshold.label})`,
        );
        break; // Only apply the highest weight
      }
    }

    // Add context if multiple features are nearby
    if (features.length > 1 && score > 0) {
      const nearbyCount = features.filter((f) => f.distanceInMeters <= thresholds[0].distance).length;
      if (nearbyCount > 1) {
        reasons.push(`${nearbyCount} ${featureType}s in immediate vicinity`);
      }
    }

    return { score, reasons };
  }
}
