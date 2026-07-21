import { IncidentStatus, IncidentSeverity } from '@prisma/client';

export class IncidentResponseDto {
  id!: string;
  title!: string;
  description!: string;
  latitude!: number;
  longitude!: number;
  address!: string;
  status!: IncidentStatus;
  severity!: IncidentSeverity;
  imageUrls!: string[];
  totalFunding!: string;
  fundingGoal!: string | null;
  aiConfidence!: number | null;
  aiRecommendation!: string | null;
  reporterId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
