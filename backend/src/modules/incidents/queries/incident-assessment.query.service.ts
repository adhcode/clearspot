import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { IncidentAssessmentRepository } from '@core/environmental-assessment/repositories/incident-assessment.repository';
import {
  IncidentAssessmentResponse,
  IncidentInfoDto,
  AssessmentSummaryDto,
  LocationIntelligenceSummaryDto,
  FundingInfoDto,
  TimelineEventDto,
} from '../dto/incident-assessment-response.dto';

/**
 * Query service for incident assessment data
 * Orchestrates data retrieval from multiple sources
 * Never triggers external API calls or re-analysis
 */
@Injectable()
export class IncidentAssessmentQueryService {
  private readonly logger = new Logger(IncidentAssessmentQueryService.name);

  constructor(
    private prisma: PrismaService,
    private assessmentRepository: IncidentAssessmentRepository,
  ) {}

  /**
   * Get complete incident assessment data
   * Single query endpoint for frontend assessment screen
   * 
   * @param incidentId - The incident ID
   * @returns Complete assessment response
   * @throws NotFoundException if incident doesn't exist
   */
  async getIncidentAssessment(incidentId: string): Promise<IncidentAssessmentResponse> {
    const startTime = Date.now();

    // Fetch incident with related data
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        contributions: {
          select: {
            amount: true,
            status: true,
            contributorId: true,
          },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException(`Incident with ID ${incidentId} not found`);
    }

    // Fetch assessment (may not exist yet)
    const assessment = await this.assessmentRepository.findLatestByIncidentId(incidentId);

    // Transform data to DTOs
    const incidentInfo = this.transformIncidentInfo(incident);
    const assessmentSummary = assessment ? this.transformAssessment(assessment) : null;
    const assessmentStatus = this.determineAssessmentStatus(assessment);
    const locationIntelligence = assessment
      ? this.transformLocationIntelligence(assessment.locationContext)
      : null;
    const funding = this.transformFunding(incident);
    const timeline = this.buildTimeline(incident);
    const metadata = this.buildMetadata(incident, assessment);

    const latency = Date.now() - startTime;
    this.logger.log(
      `Assessment query completed for incident ${incidentId} - Latency: ${latency}ms`,
    );

    return new IncidentAssessmentResponse({
      incident: incidentInfo,
      assessment: assessmentSummary,
      assessmentStatus,
      locationIntelligence,
      funding,
      timeline,
      metadata,
    });
  }

  private transformIncidentInfo(incident: any): IncidentInfoDto {
    return {
      id: incident.id,
      title: incident.title,
      description: incident.description,
      status: incident.status,
      severity: incident.severity,
      imageUrls: incident.imageUrls,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      location: {
        latitude: incident.latitude,
        longitude: incident.longitude,
        address: incident.address,
      },
      reporter: incident.reporter
        ? {
            id: incident.reporter.id,
            name: this.formatUserName(incident.reporter),
          }
        : null,
    };
  }

  private transformAssessment(assessment: any): AssessmentSummaryDto {
    return {
      score: assessment.score,
      priority: assessment.priority,
      estimatedCleanupCost: Number(assessment.estimatedCleanupCost),
      confidence: assessment.aiConfidence,
      reasons: assessment.reasons,
      recommendations: assessment.recommendations,
      assessmentVersion: assessment.assessmentVersion,
      generatedAt: assessment.generatedAt,
    };
  }

  private transformLocationIntelligence(locationContext: any): LocationIntelligenceSummaryDto {
    const context = locationContext as any;

    // Count nearby features
    const nearbySchools = context.schools?.length || 0;
    const nearbyHospitals = context.hospitals?.length || 0;
    const nearbyClinics = context.clinics?.length || 0;
    const nearbyMarkets = context.markets?.length || 0;
    const nearbyBusStops = context.busStops?.length || 0;
    const nearbyWaterways = context.waterways?.length || 0;

    // Generate risk factors based on proximity
    const riskFactors: string[] = [];

    if (nearbySchools > 0) {
      const closestSchool = context.schools[0];
      if (closestSchool.distanceInMeters < 250) {
        riskFactors.push('Very close to school (<250m)');
      } else if (closestSchool.distanceInMeters < 500) {
        riskFactors.push('Close to school (<500m)');
      }
    }

    if (nearbyHospitals > 0) {
      const closestHospital = context.hospitals[0];
      if (closestHospital.distanceInMeters < 500) {
        riskFactors.push('Near healthcare facility');
      }
    }

    if (nearbyWaterways > 0) {
      const closestWaterway = context.waterways[0];
      if (closestWaterway.distanceInMeters < 250) {
        riskFactors.push('Risk of water contamination');
      }
    }

    if (nearbyMarkets > 0) {
      riskFactors.push('High foot traffic area');
    }

    const sourceStatus = context.sourceStatus || 'UNKNOWN';

    return {
      nearbySchools,
      nearbyHospitals,
      nearbyClinics,
      nearbyMarkets,
      nearbyBusStops,
      nearbyWaterways,
      riskFactors,
      sourceStatus,
    };
  }

  private transformFunding(incident: any): FundingInfoDto {
    const totalRaised = Number(incident.totalFunding || 0);
    const targetAmount = incident.fundingGoal ? Number(incident.fundingGoal) : null;
    const contributorsCount = new Set(
      incident.contributions
        .filter((c: any) => c.status === 'COMPLETED')
        .map((c: any) => c.contributorId),
    ).size;

    let fundingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
    let fundingPercentage = 0;

    if (totalRaised > 0) {
      fundingStatus = 'IN_PROGRESS';
      if (targetAmount) {
        fundingPercentage = Math.round((totalRaised / targetAmount) * 100);
        if (fundingPercentage >= 100) {
          fundingStatus = 'COMPLETED';
        }
      }
    }

    return {
      totalRaised,
      targetAmount,
      contributorsCount,
      fundingStatus,
      fundingPercentage,
    };
  }

  private buildTimeline(incident: any): TimelineEventDto[] {
    const timeline: TimelineEventDto[] = [];

    // Incident creation
    timeline.push({
      status: 'REPORTED',
      description: 'Incident reported',
      timestamp: incident.createdAt,
      actor: incident.reporter
        ? {
            id: incident.reporter.id,
            name: this.formatUserName(incident.reporter),
            role: 'Citizen',
          }
        : undefined,
    });

    // Reviews
    for (const review of incident.reviews || []) {
      timeline.push({
        status: review.decision,
        description: this.getReviewDescription(review.decision),
        timestamp: review.createdAt,
        actor: {
          id: review.reviewer.id,
          name: this.formatUserName(review.reviewer),
          role: this.formatRole(review.reviewer.role),
        },
      });
    }

    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private buildMetadata(incident: any, assessment: any) {
    return {
      hasAssessment: assessment !== null,
      canEdit: incident.status === 'REPORTED' || incident.status === 'UNDER_REVIEW',
      canFund: incident.status !== 'COMPLETED' && incident.status !== 'REJECTED',
      lastUpdated: incident.updatedAt,
    };
  }

  private determineAssessmentStatus(
    assessment: any,
  ): 'AVAILABLE' | 'PENDING' | 'FAILED' {
    if (!assessment) {
      return 'PENDING';
    }
    // Could add logic to detect failed assessments based on data quality
    return 'AVAILABLE';
  }

  private formatUserName(user: any): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.email || 'Anonymous';
  }

  private getReviewDescription(decision: string): string {
    const descriptions: Record<string, string> = {
      UNDER_REVIEW: 'Under officer review',
      APPROVED: 'Approved for cleanup',
      REJECTED: 'Rejected',
      ASSIGNED: 'Assigned to cleanup crew',
      IN_PROGRESS: 'Cleanup in progress',
      COMPLETED: 'Cleanup completed',
    };
    return descriptions[decision] || decision;
  }

  private formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      CITIZEN: 'Citizen',
      OFFICER: 'Environmental Officer',
      VENDOR: 'Cleanup Vendor',
      ADMIN: 'Administrator',
    };
    return roleMap[role] || role;
  }
}
