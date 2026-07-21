export type WasteType =
  | 'Household Waste'
  | 'Construction Debris'
  | 'Industrial Waste'
  | 'Toxic/Hazardous'
  | 'Mixed Waste'
  | 'Unknown';

export type EstimatedSize = 'Small' | 'Medium' | 'Large' | 'Very Large';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IllegalDumpAnalysis {
  isIllegalDump: boolean;
  confidence: number;
  wasteType: WasteType;
  estimatedSize: EstimatedSize;
  priority: Priority;
  estimatedCleanupCost: number;
  reasoning: string;
}
