import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { HistoricalContext } from '../types/assessment.types';
import { IncidentStatus } from '@prisma/client';

@Injectable()
export class IncidentHistoryService {
  constructor(private prisma: PrismaService) {}

  async getHistoricalContext(
    latitude: number,
    longitude: number,
    radiusInMeters: number = 1000,
  ): Promise<HistoricalContext> {
    // Calculate approximate bounding box (rough approximation)
    // 1 degree latitude ≈ 111km
    // 1 degree longitude ≈ 111km * cos(latitude)
    const latDelta = radiusInMeters / 111000;
    const lonDelta = radiusInMeters / (111000 * Math.cos((latitude * Math.PI) / 180));

    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLon = longitude - lonDelta;
    const maxLon = longitude + lonDelta;

    // Get nearby incidents
    const nearbyIncidents = await this.prisma.incident.findMany({
      where: {
        latitude: {
          gte: minLat,
          lte: maxLat,
        },
        longitude: {
          gte: minLon,
          lte: maxLon,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate metrics
    const nearbyReportsCount = nearbyIncidents.length;

    const unresolvedIncidents = nearbyIncidents.filter(
      (i) => i.status !== IncidentStatus.COMPLETED && i.status !== IncidentStatus.APPROVED,
    );
    const unresolvedIncidentsCount = unresolvedIncidents.length;

    const completedIncidents = nearbyIncidents.filter(
      (i) => i.status === IncidentStatus.COMPLETED,
    );
    const previousCleanupsCount = completedIncidents.length;

    // Calculate average resolution time
    let averageResolutionTimeHours: number | null = null;
    if (completedIncidents.length > 0) {
      const resolutionTimes = completedIncidents.map((i) => {
        const diffMs = i.updatedAt.getTime() - i.createdAt.getTime();
        return diffMs / (1000 * 60 * 60); // Convert to hours
      });
      const totalHours = resolutionTimes.reduce((sum, hours) => sum + hours, 0);
      averageResolutionTimeHours = totalHours / completedIncidents.length;
    }

    // Determine if recurring hotspot
    // A hotspot is defined as 3+ reports in the same area within 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReports = nearbyIncidents.filter((i) => i.createdAt >= thirtyDaysAgo);
    const isRecurringHotspot = recentReports.length >= 3;

    return {
      nearbyReportsCount,
      unresolvedIncidentsCount,
      previousCleanupsCount,
      isRecurringHotspot,
      averageResolutionTimeHours,
    };
  }
}
