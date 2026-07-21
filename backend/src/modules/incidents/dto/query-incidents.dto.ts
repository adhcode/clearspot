import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IncidentStatus, IncidentSeverity } from '@prisma/client';
import { PaginationDto } from '@common/dto/pagination.dto';

export class QueryIncidentsDto extends PaginationDto {
  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus;

  @IsEnum(IncidentSeverity)
  @IsOptional()
  severity?: IncidentSeverity;

  @IsString()
  @IsOptional()
  reporterId?: string;
}
