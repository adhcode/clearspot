import { Test, TestingModule } from '@nestjs/testing';
import { EnvironmentalAssessmentService } from './environmental-assessment.service';
import { VisualAssessmentScorer } from './scoring/visual-assessment.scorer';
import { LocationAssessmentScorer } from './scoring/location-assessment.scorer';
import { HistoricalAssessmentScorer } from './scoring/historical-assessment.scorer';
import { RecommendationGenerator } from './scoring/recommendation.generator';
import { GeminiAnalysis, HistoricalContext } from './types/assessment.types';
import { LocationContext } from '@integrations/maps/types/location-context.types';
import { Incident } from '@prisma/client';

describe('EnvironmentalAssessmentService', () => {
  let service: EnvironmentalAssessmentService;

  const mockIncident = {
    id: 'test-id',
    latitude: 6.5244,
    longitude: 3.3792,
  } as Incident;

  const mockAiAnalysis: GeminiAnalysis = {
    isIllegalDump: true,
    confidence: 0.95,
    wasteType: 'Toxic/Hazardous',
    estimatedSize: 'Large',
    priority: 'Critical',
    estimatedCleanupCost: 50000,
    reasoning: 'Large toxic waste pile blocking drainage near school',
  };

  const mockLocationContext: LocationContext = {
    schools: [
      { name: 'Test School', latitude: 6.5244, longitude: 3.3792, distanceInMeters: 200 },
    ],
    hospitals: [],
    clinics: [],
    markets: [],
    busStops: [],
    primaryRoads: [],
    trunkRoads: [],
    waterways: [
      { name: 'Test River', latitude: 6.5254, longitude: 3.3802, distanceInMeters: 300 },
    ],
  };

  const mockHistoricalContext: HistoricalContext = {
    nearbyReportsCount: 5,
    unresolvedIncidentsCount: 2,
    previousCleanupsCount: 3,
    isRecurringHotspot: true,
    averageResolutionTimeHours: 48,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentalAssessmentService,
        VisualAssessmentScorer,
        LocationAssessmentScorer,
        HistoricalAssessmentScorer,
        RecommendationGenerator,
      ],
    }).compile();

    service = module.get<EnvironmentalAssessmentService>(EnvironmentalAssessmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('performAssessment', () => {
    it('should generate CRITICAL priority for hazardous waste near school', async () => {
      const result = await service.performAssessment(
        mockIncident,
        mockAiAnalysis,
        mockLocationContext,
        mockHistoricalContext,
      );

      expect(result.priority).toBe('CRITICAL');
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.estimatedCleanupCost).toBeGreaterThan(0);
    });

    it('should include hazardous materials in reasons', async () => {
      const result = await service.performAssessment(
        mockIncident,
        mockAiAnalysis,
        mockLocationContext,
        mockHistoricalContext,
      );

      const hasHazardReason = result.reasons.some((r) =>
        r.toLowerCase().includes('hazardous'),
      );
      expect(hasHazardReason).toBe(true);
    });

    it('should include school proximity in reasons', async () => {
      const result = await service.performAssessment(
        mockIncident,
        mockAiAnalysis,
        mockLocationContext,
        mockHistoricalContext,
      );

      const hasSchoolReason = result.reasons.some((r) => r.toLowerCase().includes('school'));
      expect(hasSchoolReason).toBe(true);
    });

    it('should handle missing AI analysis gracefully', async () => {
      const result = await service.performAssessment(
        mockIncident,
        null,
        mockLocationContext,
        mockHistoricalContext,
      );

      expect(result).toBeDefined();
      expect(result.priority).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should generate LOW priority for minimal context', async () => {
      const minimalAi: GeminiAnalysis = {
        isIllegalDump: true,
        confidence: 0.8,
        wasteType: 'Household Waste',
        estimatedSize: 'Small',
        priority: 'Low',
        estimatedCleanupCost: 10000,
        reasoning: 'Small household waste',
      };

      const emptyLocation: LocationContext = {
        schools: [],
        hospitals: [],
        clinics: [],
        markets: [],
        busStops: [],
        primaryRoads: [],
        trunkRoads: [],
        waterways: [],
      };

      const minimalHistory: HistoricalContext = {
        nearbyReportsCount: 0,
        unresolvedIncidentsCount: 0,
        previousCleanupsCount: 0,
        isRecurringHotspot: false,
        averageResolutionTimeHours: null,
      };

      const result = await service.performAssessment(
        mockIncident,
        minimalAi,
        emptyLocation,
        minimalHistory,
      );

      expect(result.priority).toBe('LOW');
    });

    it('should cap score at maximum', async () => {
      const result = await service.performAssessment(
        mockIncident,
        mockAiAnalysis,
        mockLocationContext,
        mockHistoricalContext,
      );

      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should include generatedAt timestamp', async () => {
      const result = await service.performAssessment(
        mockIncident,
        mockAiAnalysis,
        mockLocationContext,
        mockHistoricalContext,
      );

      expect(result.generatedAt).toBeInstanceOf(Date);
    });
  });
});
