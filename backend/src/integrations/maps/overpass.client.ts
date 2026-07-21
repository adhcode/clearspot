import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OverpassResponse } from './types/location-context.types';

@Injectable()
export class OverpassClient {
  private readonly logger = new Logger(OverpassClient.name);
  private readonly apiUrl: string;
  private readonly requestTimeout = 15000; // Reduced from 30s to 15s

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>(
      'OVERPASS_API_URL',
      'https://overpass-api.de/api/interpreter',
    );
  }

  async executeQuery(query: string): Promise<OverpassResponse> {
    const startTime = Date.now();

    try {
      const response = await this.executeWithTimeout(query);

      const latency = Date.now() - startTime;
      this.logger.log(
        `Overpass query completed - Latency: ${latency}ms, Elements: ${response.elements.length}`,
      );

      return response;
    } catch (error) {
      const latency = Date.now() - startTime;
      const err = error as Error;
      this.logger.warn(
        `Overpass query failed - Latency: ${latency}ms, Error: ${err.message}`,
      );

      // Retry once for transient failures
      try {
        this.logger.log('Retrying Overpass query...');
        const retryResponse = await this.executeWithTimeout(query);
        const retryLatency = Date.now() - startTime;
        this.logger.log(`Retry succeeded - Total latency: ${retryLatency}ms`);
        return retryResponse;
      } catch (retryError) {
        const retryErr = retryError as Error;
        const totalLatency = Date.now() - startTime;
        this.logger.error(
          `Overpass retry failed - Total latency: ${totalLatency}ms, Error: ${retryErr.message}`,
        );
        throw retryError;
      }
    }
  }

  private async executeWithTimeout(query: string): Promise<OverpassResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'ClearSpot-Backend/1.0',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Overpass API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as OverpassResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}
