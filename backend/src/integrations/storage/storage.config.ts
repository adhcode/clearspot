import { IsString, IsUrl } from 'class-validator';

export class StorageConfig {
  @IsString()
  R2_ACCOUNT_ID!: string;

  @IsString()
  R2_ACCESS_KEY_ID!: string;

  @IsString()
  R2_SECRET_ACCESS_KEY!: string;

  @IsString()
  R2_BUCKET_NAME!: string;

  @IsUrl({ require_tld: false })
  R2_PUBLIC_URL!: string;
}
