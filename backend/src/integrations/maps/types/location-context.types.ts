export interface NearbyFeature {
  name?: string;
  latitude: number;
  longitude: number;
  distanceInMeters: number;
}

export interface LocationContext {
  schools: NearbyFeature[];
  hospitals: NearbyFeature[];
  clinics: NearbyFeature[];
  markets: NearbyFeature[];
  busStops: NearbyFeature[];
  primaryRoads: NearbyFeature[];
  trunkRoads: NearbyFeature[];
  waterways: NearbyFeature[];
}

export interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OverpassWay {
  type: 'way';
  id: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
  nodes?: number[];
}

export type OverpassElement = OverpassNode | OverpassWay;

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}
