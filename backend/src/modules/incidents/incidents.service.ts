import { Injectable, Logger } from '@nestjs/common';
import { Incident, IncidentStatus, IncidentSeverity, Role } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { GeminiService } from '@integrations/gemini/gemini.service';
import { OverpassService } from '@integrations/maps/overpass.service';
import { EnvironmentalAssessmentService } from '@core/environmental-assessment/environmental-assessment.service';
import { IncidentHistoryService } from '@core/environmental-assessment/services/incident-history.service';
import {
  IncidentNotFoundException,
  UnauthorizedAccessException,
} from '@common/exceptions/domain.exceptions';
import { createPaginatedResponse, PaginatedResponse } from '@common/types/pagination.types';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { QueryIncidentsDto } from './dto/query-incidents.dto';
import { ReviewIncidentDto } from './dto/review-incident.dto';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private prisma: PrismaService,
    private geminiService: GeminiService,
    private overpassService: OverpassService,
    private assessmentService: EnvironmentalAssessmentService,
    private historyService: IncidentHistoryService,
  ) {}

  async create(dto: CreateIncidentDto, userId?: string): Promise<Incident> {
    this.logger.log(
      `Creating incident at ${dto.latitude},${dto.longitude} by ${userId || 'guest'}`,
    );

    // Step 1: Get AI visual analysis
    const aiAnalysis = await this.geminiService.analyzeIllegalDump(
      dto.title,
      dto.description,
      dto.address,
      dto.imageUrls[0],
    );

    // Step 2: Get geographical context
    const locationContext = await this.overpassService.analyzeLocation(
      dto.latitude,
      dto.longitude,
    );

    // Step 3: Get historical context
    const historicalContext = await this.historyService.getHistoricalContext(
      dto.latitude,
      dto.longitude,
    );

    // Step 4: Create incident record
    const incident = await this.prisma.incident.create({
      data: {
        title: dto.title,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        imageUrls: dto.imageUrls,
        reporterId: userId || null,
        guestEmail: dto.guestEmail || null,
        guestPhone: dto.guestPhone || null,
        status: IncidentStatus.REPORTED,
        severity: IncidentSeverity.MEDIUM, // Temporary, will be updated
      },
    });

    // Step 5: Perform comprehensive environmental assessment
    const assessment = await this.assessmentService.performAssessment(
      incident,
      aiAnalysis,
      locationContext,
      historicalContext,
    );

    // Step 6: Update incident with assessment results
    const updatedIncident = await this.prisma.incident.update({
      where: { id: incident.id },
      data: {
        severity: this.mapPriorityToSeverity(assessment.priority),
        aiConfidence: aiAnalysis?.confidence || null,
        aiRecommendation: this.formatAssessmentRecommendation(assessment, aiAnalysis),
      },
    });

    this.logger.log(
      `Incident created: ${incident.id} - Priority: ${assessment.priority}, Score: ${assessment.score}, Severity: ${updatedIncident.severity}`,
    );

    return updatedIncident;
  }

  private mapPriorityToSeverity(
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  ): IncidentSeverity {
    const mapping = {
      LOW: IncidentSeverity.LOW,
      MEDIUM: IncidentSeverity.MEDIUM,
      HIGH: IncidentSeverity.HIGH,
      CRITICAL: IncidentSeverity.CRITICAL,
    };

    return mapping[priority];
  }

  private formatAssessmentRecommendation(
    assessment: {
      score: number;
      priority: string;
      reasons: string[];
      estimatedCleanupCost: number;
    },
    aiAnalysis: { wasteType: string; estimatedSize: string } | null,
  ): string {
    const sections: string[] = [];

    // AI Analysis if available
    if (aiAnalysis) {
      sections.push(`Waste Type: ${aiAnalysis.wasteType}`);
      sections.push(`Estimated Size: ${aiAnalysis.estimatedSize}`);
    }

    // Assessment details
    sections.push(
      `Estimated Cleanup Cost: ₦${assessment.estimatedCleanupCost.toLocaleString()}`,
    );
    sections.push(`Assessment Score: ${assessment.score}/100`);
    sections.push(`Priority: ${assessment.priority}`);
    sections.push('');

    // Assessment reasons
    sections.push('Assessment Factors:');
    assessment.reasons.forEach((reason) => {
      sections.push(`• ${reason}`);
    });

    return sections.join('\n');
  }

  async findAll(query: QueryIncidentsDto): Promise<PaginatedResponse<Incident>> {
    const { page, limit, status, severity, reporterId } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(severity && { severity }),
      ...(reporterId && { reporterId }),
    };

    const [incidents, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return createPaginatedResponse(incidents, total, page, limit);
  }

  async findOne(id: string): Promise<Incident> {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
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
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          include: {
            vendor: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!incident) {
      throw new IncidentNotFoundException(id);
    }

    return incident;
  }

  async update(id: string, dto: UpdateIncidentDto, userId: string, userRole: Role): Promise<Incident> {
    const incident = await this.findOne(id);

    if (userRole === Role.CITIZEN && incident.reporterId !== userId) {
      throw new UnauthorizedAccessException('this incident');
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
        ...(dto.severity && { severity: dto.severity }),
      },
    });

    this.logger.log(`Incident updated: ${id} by ${userId}`);

    return updated;
  }

  async review(id: string, dto: ReviewIncidentDto, reviewerId: string): Promise<Incident> {
    await this.findOne(id);

    const [updated] = await this.prisma.$transaction([
      this.prisma.incident.update({
        where: { id },
        data: { status: dto.decision },
      }),
      this.prisma.incidentReview.create({
        data: {
          incidentId: id,
          reviewerId,
          decision: dto.decision,
          notes: dto.notes,
        },
      }),
    ]);

    this.logger.log(`Incident reviewed: ${id} - ${dto.decision} by ${reviewerId}`);

    return updated;
  }

  async findByGuestEmail(email: string): Promise<Incident[]> {
    return this.prisma.incident.findMany({
      where: { guestEmail: email },
      orderBy: { createdAt: 'desc' },
    });
  }
}
