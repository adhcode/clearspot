import { Injectable, Logger } from '@nestjs/common';
import { OverpassClient } from './overpass.client';
import { OverpassQueryBuilder } from './queries/overpass-query.builder';
import {
  LocationContext,
  NearbyFeature,
  OverpassElement,
  OverpassNode,
  OverpassWay,
} from './types/location-context.types';
import { MAX_RESULTS_PER_CATEGORY } from './constants/search-radii.constants';

@Injectable()
export class OverpassService {
  private readonly logger = new Logger(OverpassService.name);

  constructor(private overpassClient: OverpassClient) {}

  async analyzeLocation(latitude: number, longitude: number): Promise<LocationContext> {
    this.logger.log(`Analyzing location: ${latitude}, ${longitude}`);

    try {
      const query = OverpassQueryBuilder.buildLocationQuery(latitude, longitude);
      const response = await this.overpassClient.executeQuery(query);

      const context = this.parseLocationContext(response.elements, latitude, longitude);

      this.logger.log(
        `Location analysis complete - Schools: ${context.schools.length}, Hospitals: ${context.hospitals.length}, Clinics: ${context.clinics.length}, Markets: ${context.markets.length}, Bus Stops: ${context.busStops.length}, Primary Roads: ${context.primaryRoads.length}, Trunk Roads: ${context.trunkRoads.length}, Waterways: ${context.waterways.length}`,
      );

      return context;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Location analysis failed: ${err.message}`);

      // Graceful fallback - return empty context
      return this.emptyLocationContext();
    }
  }

  private parseLocationContext(
    elements: OverpassElement[],
    originLat: number,
    originLon: number,
  ): LocationContext {
    const schools: NearbyFeature[] = [];
    const hospitals: NearbyFeature[] = [];
    const clinics: NearbyFeature[] = [];
    const markets: NearbyFeature[] = [];
    const busStops: NearbyFeature[] = [];
    const primaryRoads: NearbyFeature[] = [];
    const trunkRoads: NearbyFeature[] = [];
    const waterways: NearbyFeature[] = [];

    for (const element of elements) {
      const feature = this.parseElement(element, originLat, originLon);
      if (!feature) continue;

      const tags = element.tags || {};

      if (tags.amenity === 'school') {
        schools.push(feature);
      } else if (tags.amenity === 'hospital') {
        hospitals.push(feature);
      } else if (tags.amenity === 'clinic') {
        clinics.push(feature);
      } else if (tags.amenity === 'marketplace') {
        markets.push(feature);
      } else if (tags.highway === 'bus_stop') {
        busStops.push(feature);
      } else if (tags.highway === 'primary') {
        primaryRoads.push(feature);
      } else if (tags.highway === 'trunk') {
        trunkRoads.push(feature);
      } else if (tags.waterway || tags.natural === 'water') {
        waterways.push(feature);
      }
    }

    return {
      schools: this.sortAndLimit(this.removeDuplicates(schools)),
      hospitals: this.sortAndLimit(this.removeDuplicates(hospitals)),
      clinics: this.sortAndLimit(this.removeDuplicates(clinics)),
      markets: this.sortAndLimit(this.removeDuplicates(markets)),
      busStops: this.sortAndLimit(this.removeDuplicates(busStops)),
      primaryRoads: this.sortAndLimit(this.removeDuplicates(primaryRoads)),
      trunkRoads: this.sortAndLimit(this.removeDuplicates(trunkRoads)),
      waterways: this.sortAndLimit(this.removeDuplicates(waterways)),
    };
  }

  private parseElement(
    element: OverpassElement,
    originLat: number,
    originLon: number,
  ): NearbyFeature | null {
    let lat: number;
    let lon: number;

    if (element.type === 'node') {
      const node = element as OverpassNode;
      lat = node.lat;
      lon = node.lon;
    } else if (element.type === 'way') {
      const way = element as OverpassWay;
      if (!way.center) {
        return null;
      }
      lat = way.center.lat;
      lon = way.center.lon;
    } else {
      return null;
    }

    const distance = this.calculateDistance(originLat, originLon, lat, lon);
    const name = element.tags?.name;

    return {
      name,
      latitude: lat,
      longitude: lon,
      distanceInMeters: Math.round(distance),
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private removeDuplicates(features: NearbyFeature[]): NearbyFeature[] {
    const seen = new Set<string>();
    const unique: NearbyFeature[] = [];

    for (const feature of features) {
      const key = `${feature.latitude.toFixed(6)},${feature.longitude.toFixed(6)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(feature);
      }
    }

    return unique;
  }

  private sortAndLimit(features: NearbyFeature[]): NearbyFeature[] {
    return features
      .sort((a, b) => a.distanceInMeters - b.distanceInMeters)
      .slice(0, MAX_RESULTS_PER_CATEGORY);
  }

  private emptyLocationContext(): LocationContext {
    return {
      schools: [],
      hospitals: [],
      clinics: [],
      markets: [],
      busStops: [],
      primaryRoads: [],
      trunkRoads: [],
      waterways: [],
    };
  }
}
