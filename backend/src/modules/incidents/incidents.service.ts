import { Injectable, Logger } from '@nestjs/common';
import { Incident, IncidentStatus, Role } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { GeminiService } from '@integrations/gemini/gemini.service';
import { IncidentNotFoundException, UnauthorizedAccessException } from '@common/exceptions/domain.exceptions';
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
  ) {}

  async create(dto: CreateIncidentDto, userId?: string): Promise<Incident> {
    const analysis = await this.geminiService.analyzeIncident(
      dto.title,
      dto.description,
      dto.address,
    );

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
        severity: analysis?.severity || 'MEDIUM',
        aiConfidence: analysis?.confidence || null,
        aiRecommendation: analysis
          ? `${analysis.recommendation}\n\nReasoning: ${analysis.reasoning}`
          : null,
      },
    });

    this.logger.log(
      `Incident created: ${incident.id} by ${userId ? 'user' : 'guest'} - AI: ${analysis?.severity || 'N/A'} (${analysis?.confidence || 0})`,
    );

    return incident;
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
