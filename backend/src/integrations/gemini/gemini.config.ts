import { IsString, IsOptional } from 'class-validator';

export class GeminiConfig {
  @IsString()
  GEMINI_API_KEY!: string;

  @IsString()
  @IsOptional()
  GEMINI_MODEL: string = 'gemini-2.0-flash-exp';
}
