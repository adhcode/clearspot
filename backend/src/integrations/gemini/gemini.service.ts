import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  IllegalDumpAnalysis,
  WasteType,
  EstimatedSize,
  Priority,
} from './interfaces/analysis-result.interface';
import { GeminiAnalysisException, GeminiInvalidResponseException } from './exceptions/gemini.exception';
import { ILLEGAL_DUMP_ANALYSIS_PROMPT } from './prompts/illegal-dump-analysis.prompt';

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;
  private readonly modelName: string;
  private readonly maxRetries = 3;
  private readonly initialRetryDelay = 1000;
  private readonly requestTimeout = 30000;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.modelName = this.configService.get<string>('GEMINI_MODEL', 'gemini-1.5-flash');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required but not configured');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
    });
  }

  onModuleInit(): void {
    this.logger.log(`Gemini service initialized with model: ${this.modelName}`);
  }

  async analyzeIllegalDump(
    title: string,
    description: string,
    location: string,
    imageUrl?: string,
  ): Promise<IllegalDumpAnalysis | null> {
    const startTime = Date.now();

    try {
      const result = await this.executeWithRetry(async () => {
        const prompt = this.buildPrompt(title, description, location);

        const parts: any[] = [{ text: prompt }];

        if (imageUrl) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: await this.fetchImageAsBase64(imageUrl),
            },
          });
        }

        const response = await Promise.race([
          this.model.generateContent(parts),
          this.createTimeout(),
        ]);

        if (!response) {
          throw new Error('Request timeout');
        }

        const text = response.response.text();
        return this.parseAndValidateResponse(text);
      });

      const latency = Date.now() - startTime;
      this.logger.log(
        `Analysis completed - Model: ${this.modelName}, Latency: ${latency}ms, Priority: ${result.priority}`,
      );

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      const err = error as Error;
      this.logger.error(
        `Analysis failed - Model: ${this.modelName}, Latency: ${latency}ms, Error: ${err.message}, Stack: ${err.stack?.substring(0, 200)}`,
      );

      return null;
    }
  }

  private buildPrompt(title: string, description: string, location: string): string {
    return `${ILLEGAL_DUMP_ANALYSIS_PROMPT}

Incident Details:
Title: ${title}
Description: ${description}
Location: ${location}

Provide your analysis:`;
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to fetch image from ${url}: ${err.message}`);
      throw err;
    }
  }

  private parseAndValidateResponse(text: string): IllegalDumpAnalysis {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new GeminiInvalidResponseException('No JSON object found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      this.validateAnalysisSchema(parsed);

      return {
        isIllegalDump: Boolean(parsed.isIllegalDump),
        confidence: this.clamp(parsed.confidence, 0, 1),
        wasteType: parsed.wasteType,
        estimatedSize: parsed.estimatedSize,
        priority: parsed.priority,
        estimatedCleanupCost: Math.max(0, parsed.estimatedCleanupCost),
        reasoning: String(parsed.reasoning).substring(0, 200),
      };
    } catch (error) {
      if (error instanceof GeminiInvalidResponseException) {
        throw error;
      }
      const err = error as Error;
      throw new GeminiInvalidResponseException(`Failed to parse response: ${err.message}`);
    }
  }

  private validateAnalysisSchema(data: any): void {
    const requiredFields = [
      'isIllegalDump',
      'confidence',
      'wasteType',
      'estimatedSize',
      'priority',
      'estimatedCleanupCost',
      'reasoning',
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new GeminiInvalidResponseException(`Missing required field: ${field}`);
      }
    }

    const validWasteTypes: WasteType[] = [
      'Household Waste',
      'Construction Debris',
      'Industrial Waste',
      'Toxic/Hazardous',
      'Mixed Waste',
      'Unknown',
    ];

    const validSizes: EstimatedSize[] = ['Small', 'Medium', 'Large', 'Very Large'];
    const validPriorities: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

    if (!validWasteTypes.includes(data.wasteType)) {
      throw new GeminiInvalidResponseException(`Invalid wasteType: ${data.wasteType}`);
    }

    if (!validSizes.includes(data.estimatedSize)) {
      throw new GeminiInvalidResponseException(`Invalid estimatedSize: ${data.estimatedSize}`);
    }

    if (!validPriorities.includes(data.priority)) {
      throw new GeminiInvalidResponseException(`Invalid priority: ${data.priority}`);
    }

    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
      throw new GeminiInvalidResponseException('Invalid confidence value');
    }

    if (typeof data.estimatedCleanupCost !== 'number' || data.estimatedCleanupCost < 0) {
      throw new GeminiInvalidResponseException('Invalid estimatedCleanupCost value');
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.maxRetries - 1) {
          const delay = this.initialRetryDelay * Math.pow(2, attempt);
          this.logger.warn(`Retry attempt ${attempt + 1} after ${delay}ms - Error: ${lastError.message}`);
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(`All retries failed - Last error: ${lastError!.message}`);
    throw new GeminiAnalysisException('Max retries exceeded', lastError!);
  }

  private createTimeout(): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout),
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
