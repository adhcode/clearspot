import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { QueryIncidentsDto } from './dto/query-incidents.dto';
import { ReviewIncidentDto } from './dto/review-incident.dto';
import { Public } from '@modules/auth/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RolesGuard } from '@common/guards/roles.guard';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Public()
  @Post()
  async create(@Body() dto: CreateIncidentDto, @CurrentUser() user?: JwtPayload) {
    return this.incidentsService.create(dto, user?.sub);
  }

  @Public()
  @Get()
  async findAll(@Query() query: QueryIncidentsDto) {
    return this.incidentsService.findAll(query);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentsService.update(id, dto, user.sub, user.role as Role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OFFICER, Role.ADMIN)
  @Post(':id/review')
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewIncidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentsService.review(id, dto, user.sub);
  }
}
