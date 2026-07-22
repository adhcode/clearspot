import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '@modules/auth/decorators/public.decorator';
import { IncidentAssessmentQueryService } from '../queries/incident-assessment.query.service';
import { IncidentAssessmentResponse } from '../dto/incident-assessment-response.dto';

/**
 * Incident Assessment Controller
 * Provides read-only access to complete incident assessment data
 * Designed for frontend assessment screen consumption
 */
@Controller('incidents')
export class IncidentAssessmentController {
  constructor(private readonly queryService: IncidentAssessmentQueryService) {}

  /**
   * GET /api/v1/incidents/:id/assessment
   * 
   * Returns complete incident assessment including:
   * - Incident information
   * - Environmental assessment
   * - Location intelligence summary
   * - Funding information
   * - Timeline events
   * 
   * This endpoint never triggers:
   * - AI analysis (Gemini)
   * - Geographic analysis (Overpass)
   * - External API calls
   * 
   * All data is read from persisted snapshots for high performance
   * 
   * @param id - Incident ID
   * @returns Complete assessment response
   * @throws NotFoundException if incident doesn't exist
   */
  @Public()
  @Get(':id/assessment')
  @HttpCode(HttpStatus.OK)
  async getAssessment(@Param('id') id: string): Promise<IncidentAssessmentResponse> {
    return this.queryService.getIncidentAssessment(id);
  }
}
