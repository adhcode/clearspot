import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OverpassService } from './overpass.service';
import { OverpassClient } from './overpass.client';

@Module({
  imports: [ConfigModule],
  providers: [OverpassService, OverpassClient],
  exports: [OverpassService],
})
export class MapsModule {}
