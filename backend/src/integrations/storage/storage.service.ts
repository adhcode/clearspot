import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');

    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME')!;
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL')!;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }

  async generateUploadUrl(fileName: string, contentType: string): Promise<UploadUrlResponse> {
    const fileExtension = fileName.split('.').pop();
    const fileKey = `incidents/${randomUUID()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    const publicUrl = `${this.publicUrl}/${fileKey}`;

    this.logger.log(`Generated upload URL for: ${fileKey}`);

    return {
      uploadUrl,
      fileKey,
      publicUrl,
    };
  }

  async generateMultipleUploadUrls(
    files: Array<{ fileName: string; contentType: string }>,
  ): Promise<UploadUrlResponse[]> {
    return Promise.all(
      files.map((file) => this.generateUploadUrl(file.fileName, file.contentType)),
    );
  }

  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    await this.s3Client.send(command);

    this.logger.log(`Deleted file: ${fileKey}`);
  }

  async deleteFiles(fileKeys: string[]): Promise<void> {
    await Promise.all(fileKeys.map((key) => this.deleteFile(key)));
  }

  extractFileKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1);
    } catch {
      return null;
    }
  }
}
