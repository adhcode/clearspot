import { IsEnum, IsString, IsOptional } from 'class-validator';
import { IncidentStatus } from '@prisma/client';

export class ReviewIncidentDto {
  @IsEnum(IncidentStatus)
  decision!: IncidentStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
