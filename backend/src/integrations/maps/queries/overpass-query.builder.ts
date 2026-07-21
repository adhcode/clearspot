import { SEARCH_RADII, OVERPASS_TAGS } from '../constants/search-radii.constants';

type TagConfig = { key: string; value: string | null };

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
      this.buildRadiusQuery(latitude, longitude, SEARCH_RADII.WATERWAYS, OVERPASS_TAGS.WATERWAYS),
    );

    // Natural water bodies
    queries.push(
      this.buildRadiusQuery(latitude, longitude, SEARCH_RADII.WATERWAYS, {
        key: 'natural',
        value: 'water',
      }),
    );

    return `[out:json][timeout:15];(${queries.join('')});out center;`;
  }

  private static buildRadiusQuery(
    latitude: number,
    longitude: number,
    radius: number,
    tag: TagConfig,
  ): string {
    const tagFilter = tag.value ? `["${tag.key}"="${tag.value}"]` : `["${tag.key}"]`;
    return `node${tagFilter}(around:${radius},${latitude},${longitude});way${tagFilter}(around:${radius},${latitude},${longitude});`;
  }
}
