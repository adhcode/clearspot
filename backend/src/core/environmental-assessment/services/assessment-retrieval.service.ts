import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IncidentAssessmentRepository } from '../repositories/incident-assessment.repository';
import { AssessmentResponseDto } from '../dto/assessment-response.dto';

/**
 * Service for retrieving persisted assessments
 * Never triggers re-analysis - only reads existing data
 * Provides high-performance access to assessment snapshots
 */
@Injectable()
export class AssessmentRetrievalService {
  private readonly logger = new Logger(AssessmentRetrievalService.name);

  constructor(private assessmentRepository: IncidentAssessmentRepository) {}

  /**
   * Get the latest assessment for an incident
   * Returns persisted snapshot - never triggers re-analysis
   * 
   * @param incidentId - The incident ID
   * @returns Assessment snapshot
   * @throws NotFoundException if assessment doesn't exist
   */
  async getLatestAssessment(incidentId: string): Promise<AssessmentResponseDto> {
    const startTime = Date.now();

    const assessment = await this.assessmentRepository.findLatestByIncidentId(incidentId);

    if (!assessment) {
      throw new NotFoundException(
        `Assessment not found for incident ${incidentId}. The incident may not have been analyzed yet.`,
      );
    }

    const latency = Date.now() - startTime;
    this.logger.log(
      `Assessment retrieved for incident ${incidentId} - Latency: ${latency}ms`,
    );

    return new AssessmentResponseDto({
      id: assessment.id,
      incidentId: assessment.incidentId,
      score: assessment.score,
      priority: assessment.priority,
      estimatedCleanupCost: Number(assessment.estimatedCleanupCost),
      aiConfidence: assessment.aiConfidence,
      reasons: assessment.reasons,
      recommendations: assessment.recommendations,
      visualAnalysis: assessment.visualAnalysis,
      locationContext: assessment.locationContext,
      historicalContext: assessment.historicalContext,
      assessmentVersion: assessment.assessmentVersion,
      generatedAt: assessment.generatedAt,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
    });
  }

  /**
   * Get assessments by priority level
   * Useful for dashboards and filtering
   * 
   * @param priority - Priority level (LOW, MEDIUM, HIGH, CRITICAL)
   * @param limit - Maximum number of results
   * @returns Array of assessments
   */
  async getAssessmentsByPriority(
    priority: string,
    limit = 100,
  ): Promise<AssessmentResponseDto[]> {
    const assessments = await this.assessmentRepository.findByPriority(priority, limit);

    return assessments.map(
      (assessment) =>
        new AssessmentResponseDto({
          id: assessment.id,
          incidentId: assessment.incidentId,
          score: assessment.score,
          priority: assessment.priority,
          estimatedCleanupCost: Number(assessment.estimatedCleanupCost),
          aiConfidence: assessment.aiConfidence,
          reasons: assessment.reasons,
          recommendations: assessment.recommendations,
          visualAnalysis: assessment.visualAnalysis,
          locationContext: assessment.locationContext,
          historicalContext: assessment.historicalContext,
          assessmentVersion: assessment.assessmentVersion,
          generatedAt: assessment.generatedAt,
          createdAt: assessment.createdAt,
          updatedAt: assessment.updatedAt,
        }),
    );
  }

  /**
   * Get assessment statistics
   * Provides aggregate data for analytics dashboards
   * 
   * @returns Statistics about all assessments
   */
  async getStatistics(): Promise<{
    total: number;
    byPriority: Record<string, number>;
    averageScore: number;
  }> {
    return this.assessmentRepository.getStatistics();
  }

  /**
   * Check if an incident has been assessed
   * Lightweight check without fetching full assessment data
   * 
   * @param incidentId - The incident ID
   * @returns true if assessment exists
   */
  async hasAssessment(incidentId: string): Promise<boolean> {
    return this.assessmentRepository.assessmentExists(incidentId);
  }
}
