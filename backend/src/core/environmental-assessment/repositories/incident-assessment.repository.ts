import { Injectable, Logger } from '@nestjs/common';
import { IncidentAssessment } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AssessmentPersistenceData } from '../types/persisted-assessment.types';

@Injectable()
export class IncidentAssessmentRepository {
  private readonly logger = new Logger(IncidentAssessmentRepository.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new incident assessment
   * Used when creating an incident for the first time
   */
  async createAssessment(data: AssessmentPersistenceData): Promise<IncidentAssessment> {
    const startTime = Date.now();

    try {
      const visualAnalysis = data.visualAnalysis
        ? JSON.parse(JSON.stringify(data.visualAnalysis))
        : null;
      const locationContext = JSON.parse(JSON.stringify(data.locationContext));
      const historicalContext = JSON.parse(JSON.stringify(data.historicalContext));

      const assessment = await this.prisma.incidentAssessment.create({
        data: {
          incidentId: data.incidentId,
          score: data.score,
          priority: data.priority,
          estimatedCleanupCost: data.estimatedCleanupCost,
          aiConfidence: data.aiConfidence,
          reasons: data.reasons,
          recommendations: data.recommendations,
          visualAnalysis,
          locationContext,
          historicalContext,
          assessmentVersion: data.assessmentVersion,
          generatedAt: data.generatedAt,
        },
      });

      const latency = Date.now() - startTime;
      this.logger.log(
        `Assessment created for incident ${data.incidentId} - Priority: ${data.priority}, Score: ${data.score}, Latency: ${latency}ms`,
      );

      return assessment;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to create assessment for incident ${data.incidentId}: ${err.message}`,
      );
      throw error;
    }
  }

  /**
   * Update an existing incident assessment
   * Used when re-analyzing an incident
   */
  async updateAssessment(data: AssessmentPersistenceData): Promise<IncidentAssessment> {
    const startTime = Date.now();

    try {
      const visualAnalysis = data.visualAnalysis
        ? JSON.parse(JSON.stringify(data.visualAnalysis))
        : null;
      const locationContext = JSON.parse(JSON.stringify(data.locationContext));
      const historicalContext = JSON.parse(JSON.stringify(data.historicalContext));

      const assessment = await this.prisma.incidentAssessment.update({
        where: { incidentId: data.incidentId },
        data: {
          score: data.score,
          priority: data.priority,
          estimatedCleanupCost: data.estimatedCleanupCost,
          aiConfidence: data.aiConfidence,
          reasons: data.reasons,
          recommendations: data.recommendations,
          visualAnalysis,
          locationContext,
          historicalContext,
          assessmentVersion: data.assessmentVersion,
          generatedAt: data.generatedAt,
          updatedAt: new Date(),
        },
      });

      const latency = Date.now() - startTime;
      this.logger.log(
        `Assessment updated for incident ${data.incidentId} - Priority: ${data.priority}, Score: ${data.score}, Latency: ${latency}ms`,
      );

      return assessment;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to update assessment for incident ${data.incidentId}: ${err.message}`,
      );
      throw error;
    }
  }

  /**
   * Create or update an incident assessment
   * Uses upsert to ensure exactly one assessment per incident
   */
  async upsertAssessment(data: AssessmentPersistenceData): Promise<IncidentAssessment> {
    const startTime = Date.now();

    try {
      // Convert typed objects to JSON-serializable format
      const visualAnalysis = data.visualAnalysis
        ? JSON.parse(JSON.stringify(data.visualAnalysis))
        : null;
      const locationContext = JSON.parse(JSON.stringify(data.locationContext));
      const historicalContext = JSON.parse(JSON.stringify(data.historicalContext));

      const assessment = await this.prisma.incidentAssessment.upsert({
        where: { incidentId: data.incidentId },
        create: {
          incidentId: data.incidentId,
          score: data.score,
          priority: data.priority,
          estimatedCleanupCost: data.estimatedCleanupCost,
          aiConfidence: data.aiConfidence,
          reasons: data.reasons,
          recommendations: data.recommendations,
          visualAnalysis,
          locationContext,
          historicalContext,
          assessmentVersion: data.assessmentVersion,
          generatedAt: data.generatedAt,
        },
        update: {
          score: data.score,
          priority: data.priority,
          estimatedCleanupCost: data.estimatedCleanupCost,
          aiConfidence: data.aiConfidence,
          reasons: data.reasons,
          recommendations: data.recommendations,
          visualAnalysis,
          locationContext,
          historicalContext,
          assessmentVersion: data.assessmentVersion,
          generatedAt: data.generatedAt,
          updatedAt: new Date(),
        },
      });

      const latency = Date.now() - startTime;
      this.logger.log(
        `Assessment persisted for incident ${data.incidentId} - Priority: ${data.priority}, Score: ${data.score}, Latency: ${latency}ms`,
      );

      return assessment;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to persist assessment for incident ${data.incidentId}: ${err.message}`,
      );
      throw error;
    }
  }

  /**
   * Get the latest assessment for an incident
   * This is the primary method for retrieving assessment data
   */
  async findLatestByIncidentId(incidentId: string): Promise<IncidentAssessment | null> {
    return this.prisma.incidentAssessment.findUnique({
      where: { incidentId },
    });
  }

  /**
   * Check if an assessment exists for an incident
   */
  async assessmentExists(incidentId: string): Promise<boolean> {
    const count = await this.prisma.incidentAssessment.count({
      where: { incidentId },
    });
    return count > 0;
  }

  /**
   * Delete an assessment (for testing/cleanup)
   */
  async deleteByIncidentId(incidentId: string): Promise<void> {
    await this.prisma.incidentAssessment.delete({
      where: { incidentId },
    });
    this.logger.log(`Assessment deleted for incident ${incidentId}`);
  }

  /**
   * Find all assessments with a specific priority
   */
  async findByPriority(priority: string, limit = 100): Promise<IncidentAssessment[]> {
    return this.prisma.incidentAssessment.findMany({
      where: { priority: priority as any },
      orderBy: { generatedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get assessment statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byPriority: Record<string, number>;
    averageScore: number;
  }> {
    const [total, groupedByPriority, avgScore] = await Promise.all([
      this.prisma.incidentAssessment.count(),
      this.prisma.incidentAssessment.groupBy({
        by: ['priority'],
        _count: true,
      }),
      this.prisma.incidentAssessment.aggregate({
        _avg: { score: true },
      }),
    ]);

    const byPriority = groupedByPriority.reduce(
      (acc, group) => {
        acc[group.priority] = group._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      byPriority,
      averageScore: avgScore._avg.score || 0,
    };
  }
}
