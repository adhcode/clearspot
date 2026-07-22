import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { MapsModule } from '@integrations/maps/maps.module';
import { GeminiModule } from '@integrations/gemini/gemini.module';
import { EnvironmentalAssessmentService } from './environmental-assessment.service';
import { VisualAssessmentScorer } from './scoring/visual-assessment.scorer';
import { LocationAssessmentScorer } from './scoring/location-assessment.scorer';
import { HistoricalAssessmentScorer } from './scoring/historical-assessment.scorer';
import { RecommendationGenerator } from './scoring/recommendation.generator';
import { IncidentHistoryService } from './services/incident-history.service';
import { AssessmentRetrievalService } from './services/assessment-retrieval.service';
import { IncidentAssessmentRepository } from './repositories/incident-assessment.repository';

@Module({
  imports: [DatabaseModule, MapsModule, GeminiModule],
  providers: [
    EnvironmentalAssessmentService,
    VisualAssessmentScorer,
    LocationAssessmentScorer,
    HistoricalAssessmentScorer,
    RecommendationGenerator,
    IncidentHistoryService,
    AssessmentRetrievalService,
    IncidentAssessmentRepository,
  ],
  exports: [
    EnvironmentalAssessmentService,
    IncidentHistoryService,
    AssessmentRetrievalService,
    IncidentAssessmentRepository,
  ],
})
export class EnvironmentalAssessmentModule {}
