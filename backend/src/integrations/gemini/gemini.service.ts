import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface IncidentAnalysis {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  recommendation: string;
  reasoning: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI | null;
  private readonly model: any | null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured, AI analysis will be skipped');
      this.genAI = null;
      this.model = null;
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzeIncident(
    title: string,
    description: string,
    address: string,
  ): Promise<IncidentAnalysis | null> {
    if (!this.model) {
      this.logger.warn('Gemini not configured, skipping analysis');
      return null;
    }

    try {
      const prompt = this.buildAnalysisPrompt(title, description, address);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const analysis = this.parseAnalysisResponse(text);
      
      this.logger.log(`Analyzed incident: ${title} - Severity: ${analysis.severity}, Confidence: ${analysis.confidence}`);
      
      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze incident with Gemini', error);
      return null;
    }
  }

  private buildAnalysisPrompt(title: string, description: string, address: string): string {
    return `You are an environmental analyst assessing illegal waste dump reports in Nigeria.

Analyze this incident and provide a structured assessment:

Title: ${title}
Description: ${description}
Location: ${address}

Provide your analysis in this exact JSON format:
{
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "confidence": <number between 0 and 1>,
  "recommendation": "<brief recommendation for environmental officers>",
  "reasoning": "<brief explanation of your assessment>"
}

Severity guidelines:
- LOW: Small amount of household waste, easy cleanup
- MEDIUM: Moderate waste accumulation, requires truck/crew
- HIGH: Large-scale dumping, potential health hazard
- CRITICAL: Toxic/hazardous materials, immediate action required

Consider:
- Volume/scale of waste
- Type of waste (household, construction, toxic)
- Location impact (residential, commercial, waterway)
- Health/environmental risks
- Urgency of cleanup

Respond ONLY with the JSON object, no additional text.`;
  }

  private parseAnalysisResponse(text: string): IncidentAnalysis {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        severity: parsed.severity || 'MEDIUM',
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        recommendation: parsed.recommendation || 'Review incident and assign appropriate resources.',
        reasoning: parsed.reasoning || 'Analysis completed.',
      };
    } catch (error) {
      this.logger.error('Failed to parse Gemini response', error);
      
      return {
        severity: 'MEDIUM',
        confidence: 0.5,
        recommendation: 'Manual review required - AI analysis inconclusive.',
        reasoning: 'Failed to parse AI response.',
      };
    }
  }
}
