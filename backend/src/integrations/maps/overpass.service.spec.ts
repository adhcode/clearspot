import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OverpassService } from './overpass.service';
import { OverpassClient } from './overpass.client';
import { OverpassResponse } from './types/location-context.types';

describe('OverpassService', () => {
  let service: OverpassService;
  let client: OverpassClient;

  const mockOverpassResponse: OverpassResponse = {
    version: 0.6,
    generator: 'Overpass API',
    elements: [
      {
        type: 'node',
        id: 1,
        lat: 6.5244,
        lon: 3.3792,
        tags: { amenity: 'school', name: 'Test Primary School' },
      },
      {
        type: 'node',
        id: 2,
        lat: 6.5254,
        lon: 3.3802,
        tags: { amenity: 'hospital', name: 'Test Hospital' },
      },
      {
        type: 'way',
        id: 3,
        center: { lat: 6.5264, lon: 3.3812 },
        tags: { waterway: 'river', name: 'Test River' },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverpassService,
        {
          provide: OverpassClient,
          useValue: {
            executeQuery: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://overpass-api.de/api/interpreter'),
          },
        },
      ],
    }).compile();

    service = module.get<OverpassService>(OverpassService);
    client = module.get<OverpassClient>(OverpassClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeLocation', () => {
    it('should return parsed location context with nearby features', async () => {
      jest.spyOn(client, 'executeQuery').mockResolvedValue(mockOverpassResponse);

      const result = await service.analyzeLocation(6.5244, 3.3792);

      expect(result).toBeDefined();
      expect(result.schools).toHaveLength(1);
      expect(result.schools[0].name).toBe('Test Primary School');
      expect(result.schools[0].distanceInMeters).toBeGreaterThanOrEqual(0);
      
      expect(result.hospitals).toHaveLength(1);
      expect(result.hospitals[0].name).toBe('Test Hospital');

      expect(result.waterways).toHaveLength(1);
      expect(result.waterways[0].name).toBe('Test River');
    });

    it('should calculate distances using Haversine formula', async () => {
      jest.spyOn(client, 'executeQuery').mockResolvedValue(mockOverpassResponse);

      const result = await service.analyzeLocation(6.5244, 3.3792);

      expect(result.schools[0].distanceInMeters).toBe(0); // Same location
      expect(result.hospitals[0].distanceInMeters).toBeGreaterThan(0);
      expect(result.waterways[0].distanceInMeters).toBeGreaterThan(0);
    });

    it('should sort features by distance', async () => {
      const multipleSchools: OverpassResponse = {
        version: 0.6,
        generator: 'Overpass API',
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 6.5344, // Far
            lon: 3.3892,
            tags: { amenity: 'school', name: 'Far School' },
          },
          {
            type: 'node',
            id: 2,
            lat: 6.5244, // Near
            lon: 3.3792,
            tags: { amenity: 'school', name: 'Near School' },
          },
        ],
      };

      jest.spyOn(client, 'executeQuery').mockResolvedValue(multipleSchools);

      const result = await service.analyzeLocation(6.5244, 3.3792);

      expect(result.schools[0].name).toBe('Near School');
      expect(result.schools[1].name).toBe('Far School');
      expect(result.schools[0].distanceInMeters).toBeLessThan(
        result.schools[1].distanceInMeters,
      );
    });

    it('should remove duplicate features', async () => {
      const duplicates: OverpassResponse = {
        version: 0.6,
        generator: 'Overpass API',
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 6.5244,
            lon: 3.3792,
            tags: { amenity: 'school', name: 'School A' },
          },
          {
            type: 'node',
            id: 2,
            lat: 6.5244,
            lon: 3.3792,
            tags: { amenity: 'school', name: 'School B' },
          },
        ],
      };

      jest.spyOn(client, 'executeQuery').mockResolvedValue(duplicates);

      const result = await service.analyzeLocation(6.5244, 3.3792);

      expect(result.schools).toHaveLength(1);
    });

    it('should return empty context on failure', async () => {
      jest.spyOn(client, 'executeQuery').mockRejectedValue(new Error('Network error'));

      const result = await service.analyzeLocation(6.5244, 3.3792);

      expect(result).toBeDefined();
      expect(result.schools).toEqual([]);
      expect(result.hospitals).toEqual([]);
      expect(result.waterways).toEqual([]);
    });

    it('should handle elements without center coordinates', async () => {
      const invalidWay: OverpassResponse = {
        version: 0.6,
        generator: 'Overpass API',
        elements: [
          {
            type: 'way',
            id: 1,
            tags: { amenity: 'school' },
            // Missing center
          },
        ],
      };

      jest.spyOn(client, 'executeQuery').mockResolvedValue(invalidWay);

      const result = await service.analyzeLocation(6.5244, 3.3792);

      expect(result.schools).toEqual([]);
    });
  });
});
