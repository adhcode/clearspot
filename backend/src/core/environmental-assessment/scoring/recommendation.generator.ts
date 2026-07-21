import { Injectable } from '@nestjs/common';
import { Priority } from '../types/assessment.types';

@Injectable()
export class RecommendationGenerator {
  generate(priority: Priority, score: number, hasHazardousMaterials: boolean): string[] {
    const recommendations: string[] = [];

    switch (priority) {
      case 'CRITICAL':
        recommendations.push('⚠️ Immediate cleanup required within 6 hours');
        recommendations.push('Notify environmental authority immediately');
        recommendations.push('Deploy hazmat-certified cleanup crew');

        if (hasHazardousMaterials) {
          recommendations.push('Conduct soil and water contamination assessment');
          recommendations.push('Establish safety perimeter around affected area');
        }

        recommendations.push('Consider restricting public access to immediate vicinity');
        recommendations.push('Arrange for proper hazardous waste disposal');
        break;

      case 'HIGH':
        recommendations.push('Schedule cleanup within 24 hours');
        recommendations.push('Alert local environmental officer');
        recommendations.push('Assign experienced cleanup crew');

        if (hasHazardousMaterials) {
          recommendations.push('Use appropriate protective equipment');
          recommendations.push('Follow hazardous waste handling protocols');
        }

        recommendations.push('Monitor area for additional dumping');
        break;

      case 'MEDIUM':
        recommendations.push('Include in next operational cleanup cycle (48-72 hours)');
        recommendations.push('Assign to regular cleanup crew');
        recommendations.push('Document waste type and quantity for records');

        if (score >= 45) {
          recommendations.push('Consider prioritizing if crew availability permits');
        }

        recommendations.push('Post warning signs if waste obstructs public areas');
        break;

      case 'LOW':
        recommendations.push('Schedule for routine collection');
        recommendations.push('Include in weekly cleanup operations');
        recommendations.push('Assign to standard waste collection team');
        recommendations.push('Monitor for escalation');
        break;
    }

    // Add universal recommendations
    if (priority !== 'LOW') {
      recommendations.push('Document before and after photos');
      recommendations.push('Update incident status upon completion');
    }

    return recommendations;
  }

  generatePublicGuidance(priority: Priority): string {
    switch (priority) {
      case 'CRITICAL':
        return 'This incident has been flagged as critical. Environmental response team has been notified and will respond immediately. Please avoid the area until cleanup is complete.';

      case 'HIGH':
        return 'This incident requires urgent attention. Cleanup crew will be dispatched within 24 hours. Thank you for reporting.';

      case 'MEDIUM':
        return 'This incident has been logged and will be addressed within 2-3 days as part of our regular cleanup operations. We appreciate your report.';

      case 'LOW':
        return 'This incident will be included in our routine waste collection schedule. Thank you for helping keep Lagos clean.';
    }
  }
}
