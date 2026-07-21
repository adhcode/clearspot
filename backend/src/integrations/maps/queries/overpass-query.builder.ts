import { SEARCH_RADII, OVERPASS_TAGS } from '../constants/search-radii.constants';

export class OverpassQueryBuilder {
  static buildLocationQuery(latitude: number, longitude: number): string {
    const queries: string[] = [];

    // Schools
    queries.push(
      this.buildRadiusQuery(latitude, longitude, SEARCH_RADII.SCHOOLS, OVERPASS_TAGS.SCHOOLS),
    );

    // Hospitals
    queries.push(
      this.buildRadiusQuery(latitude, longitude, SEARCH_RADII.HOSPITALS, OVERPASS_TAGS.HOSPITALS),
    );

    // Clinics
    queries.push(
      this.buildRadiusQuery(latitude, longitude, SEARCH_RADII.CLINICS, OVERPASS_TAGS.CLINICS),
    );

    // Markets
    queries.push(
      this.buildRadiusQuery(latitude, longitude, SEARCH_RADII.MARKETS, OVERPASS_TAGS.MARKETS),
    );

    // Bus Stops
    queries.push(
      this.buildRadiusQuery(latitude, longitude, SEARCH_RADII.BUS_STOPS, OVERPASS_TAGS.BUS_STOPS),
    );

    // Primary Roads
    queries.push(
      this.buildRadiusQuery(
        latitude,
        longitude,
        SEARCH_RADII.PRIMARY_ROADS,
        OVERPASS_TAGS.PRIMARY_ROADS,
      ),
    );

    // Trunk Roads
    queries.push(
      this.buildRadiusQuery(
        latitude,
        longitude,
        SEARCH_RADII.TRUNK_ROADS,
        OVERPASS_TAGS.TRUNK_ROADS,
      ),
    );

    // Waterways
    queries.push(
      this.buildWaterwayQuery(latitude, longitude, SEARCH_RADII.WATERWAYS),
    );

    return `[out:json][timeout:25];(${queries.join('')});out center;`;
  }

  private static buildRadiusQuery(
    latitude: number,
    longitude: number,
    radius: number,
    tag: string,
  ): string {
    return `node["${tag}"](around:${radius},${latitude},${longitude});way["${tag}"](around:${radius},${latitude},${longitude});`;
  }

  private static buildWaterwayQuery(
    latitude: number,
    longitude: number,
    radius: number,
  ): string {
    return `way["waterway"](around:${radius},${latitude},${longitude});node["natural"="water"](around:${radius},${latitude},${longitude});`;
  }
}
