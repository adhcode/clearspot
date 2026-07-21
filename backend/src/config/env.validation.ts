import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsUrl,
  validateSync,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  API_PREFIX: string = 'api/v1';

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRATION: string = '7d';

  @IsString()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  R2_ACCOUNT_ID!: string;

  @IsString()
  R2_ACCESS_KEY_ID!: string;

  @IsString()
  R2_SECRET_ACCESS_KEY!: string;

  @IsString()
  R2_BUCKET_NAME!: string;

  @IsUrl()
  R2_PUBLIC_URL!: string;

  @IsString()
  GEMINI_API_KEY!: string;

  @IsString()
  @IsOptional()
  GEMINI_MODEL: string = 'gemini-2.0-flash-exp';

  @IsString()
  MONNIFY_API_KEY!: string;

  @IsString()
  MONNIFY_SECRET_KEY!: string;

  @IsString()
  MONNIFY_CONTRACT_CODE!: string;

  @IsUrl()
  MONNIFY_BASE_URL!: string;

  @IsString()
  MONNIFY_WEBHOOK_SECRET!: string;

  @IsNumber()
  @Min(1)
  THROTTLE_TTL: number = 60;

  @IsNumber()
  @Min(1)
  THROTTLE_LIMIT: number = 10;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.toString()}`);
  }

  return validatedConfig;
}
