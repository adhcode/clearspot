import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { GeminiModule } from '@integrations/gemini/gemini.module';
import { MapsModule } from '@integrations/maps/maps.module';
import { EnvironmentalAssessmentModule } from '@core/environmental-assessment/environmental-assessment.module';

@Module({
  imports: [GeminiModule, MapsModule, EnvironmentalAssessmentModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
