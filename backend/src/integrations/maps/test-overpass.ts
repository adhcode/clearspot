/**
 * Manual test script for Overpass API integration
 * 
 * Run with: ts-node -r tsconfig-paths/register src/integrations/maps/test-overpass.ts
 */

import { OverpassService } from './overpass.service';
import { OverpassClient } from './overpass.client';
import { ConfigService } from '@nestjs/config';

async function testOverpassIntegration() {
  console.log('🧪 Testing Overpass API Integration\n');

  // Initialize services
  const configService = new ConfigService({
    OVERPASS_API_URL: 'https://overpass-api.de/api/interpreter',
  });

  const client = new OverpassClient(configService);
  const service = new OverpassService(client);

  // Test location: Lagos, Nigeria (Ikeja area)
  const latitude = 6.5244;
  const longitude = 3.3792;

  console.log(`📍 Analyzing location: ${latitude}, ${longitude}`);
  console.log('⏳ Fetching data from OpenStreetMap...\n');

  try {
    const startTime = Date.now();
    const context = await service.analyzeLocation(latitude, longitude);
    const duration = Date.now() - startTime;

    console.log(`✅ Analysis completed in ${duration}ms\n`);

    // Display results
    console.log('📊 Results:');
    console.log('═══════════════════════════════════════════════════\n');

    console.log(`🏫 Schools: ${context.schools.length}`);
    context.schools.slice(0, 3).forEach((school, i) => {
      console.log(
        `   ${i + 1}. ${school.name || 'Unnamed'} - ${school.distanceInMeters}m away`,
      );
    });

    console.log(`\n🏥 Hospitals: ${context.hospitals.length}`);
    context.hospitals.slice(0, 3).forEach((hospital, i) => {
      console.log(
        `   ${i + 1}. ${hospital.name || 'Unnamed'} - ${hospital.distanceInMeters}m away`,
      );
    });

    console.log(`\n🏥 Clinics: ${context.clinics.length}`);
    context.clinics.slice(0, 3).forEach((clinic, i) => {
      console.log(
        `   ${i + 1}. ${clinic.name || 'Unnamed'} - ${clinic.distanceInMeters}m away`,
      );
    });

    console.log(`\n🏪 Markets: ${context.markets.length}`);
    context.markets.slice(0, 3).forEach((market, i) => {
      console.log(
        `   ${i + 1}. ${market.name || 'Unnamed'} - ${market.distanceInMeters}m away`,
      );
    });

    console.log(`\n🚏 Bus Stops: ${context.busStops.length}`);
    context.busStops.slice(0, 3).forEach((stop, i) => {
      console.log(
        `   ${i + 1}. ${stop.name || 'Unnamed'} - ${stop.distanceInMeters}m away`,
      );
    });

    console.log(`\n🛣️  Primary Roads: ${context.primaryRoads.length}`);
    context.primaryRoads.slice(0, 3).forEach((road, i) => {
      console.log(
        `   ${i + 1}. ${road.name || 'Unnamed'} - ${road.distanceInMeters}m away`,
      );
    });

    console.log(`\n🛣️  Trunk Roads: ${context.trunkRoads.length}`);
    context.trunkRoads.slice(0, 3).forEach((road, i) => {
      console.log(
        `   ${i + 1}. ${road.name || 'Unnamed'} - ${road.distanceInMeters}m away`,
      );
    });

    console.log(`\n💧 Waterways: ${context.waterways.length}`);
    context.waterways.slice(0, 3).forEach((waterway, i) => {
      console.log(
        `   ${i + 1}. ${waterway.name || 'Unnamed'} - ${waterway.distanceInMeters}m away`,
      );
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✨ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testOverpassIntegration();
