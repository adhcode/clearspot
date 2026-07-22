import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { IncidentsController } from './incidents.controller';
import { IncidentAssessmentController } from './controllers/incident-assessment.controller';
import { IncidentsService } from './incidents.service';
import { IncidentAssessmentQueryService } from './queries/incident-assessment.query.service';
import { GeminiModule } from '@integrations/gemini/gemini.module';
import { MapsModule } from '@integrations/maps/maps.module';
import { EnvironmentalAssessmentModule } from '@core/environmental-assessment/environmental-assessment.module';

@Module({
  imports: [DatabaseModule, GeminiModule, MapsModule, EnvironmentalAssessmentModule],
  controllers: [IncidentsController, IncidentAssessmentController],
  providers: [IncidentsService, IncidentAssessmentQueryService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
