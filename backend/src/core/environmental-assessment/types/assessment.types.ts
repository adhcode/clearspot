export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EnvironmentalAssessment {
  score: number;
  priority: Priority;
  estimatedCleanupCost: number;
  reasons: string[];
  recommendations: string[];
  generatedAt: Date;
}

export interface AssessmentScore {
  score: number;
  reasons: string[];
}

export interface GeminiAnalysis {
  isIllegalDump: boolean;
  confidence: number;
  wasteType: 'Household Waste' | 'Construction Debris' | 'Industrial Waste' | 'Toxic/Hazardous' | 'Mixed Waste' | 'Unknown';
  estimatedSize: 'Small' | 'Medium' | 'Large' | 'Very Large';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedCleanupCost: number;
  reasoning: string;
}

export interface HistoricalContext {
  nearbyReportsCount: number;
  unresolvedIncidentsCount: number;
  previousCleanupsCount: number;
  isRecurringHotspot: boolean;
  averageResolutionTimeHours: number | null;
}

export interface VisualIndicators {
  hasHazardousMaterials: boolean;
  hasRoadObstruction: boolean;
  hasDrainageObstruction: boolean;
  hasSmoke: boolean;
  hasFire: boolean;
  hasStandingWater: boolean;
}
