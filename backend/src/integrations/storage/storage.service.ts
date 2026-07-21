import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { StorageException, InvalidFileException } from './exceptions/storage.exception';
import { UploadResult, PresignedUploadUrl } from './interfaces/upload-result.interface';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  EXECUTABLE_EXTENSIONS,
  StorageFolder,
} from './constants/file-validation.constants';

export interface IncidentImageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly maxRetries = 3;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');

    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME')!;
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL')!;

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName || !this.publicUrl) {
      throw new Error('Storage configuration is incomplete. Check R2_* environment variables.');
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  onModuleInit(): void {
    this.logger.log(`Storage service initialized - Bucket: ${this.bucketName}`);
  }

  async uploadIncidentImage(file: IncidentImageFile): Promise<UploadResult> {
    const startTime = Date.now();

    try {
      this.validateFile(file);

      const key = this.generateFileKey(file.originalname, StorageFolder.INCIDENTS);

      await this.executeWithRetry(async () => {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000',
        });

        await this.s3Client.send(command);
      });

      const url = `${this.publicUrl}/${key}`;
      const latency = Date.now() - startTime;

      this.logger.log(
        `Upload completed - Key: ${key}, Size: ${file.size} bytes, Latency: ${latency}ms`,
      );

      return {
        key,
        url,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const err = error as Error;
      this.logger.error(`Upload failed - Latency: ${latency}ms, Error: ${err.message}`);

      if (error instanceof InvalidFileException) {
        throw error;
      }

      throw new StorageException('Failed to upload file', err);
    }
  }

  async generatePresignedUploadUrl(
    fileName: string,
    contentType: string,
    folder: StorageFolder = StorageFolder.INCIDENTS,
  ): Promise<PresignedUploadUrl> {
    try {
      this.validateMimeType(contentType);

      const key = this.generateFileKey(fileName, folder);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      });

      const publicUrl = `${this.publicUrl}/${key}`;

      this.logger.log(`Generated presigned URL - Key: ${key}`);

      return {
        uploadUrl,
        key,
        publicUrl,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to generate presigned URL: ${err.message}`);
      throw new StorageException('Failed to generate upload URL', err);
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.executeWithRetry(async () => {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });

        await this.s3Client.send(command);
      });

      this.logger.log(`Deleted object - Key: ${key}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to delete object ${key}: ${err.message}`);
      throw new StorageException(`Failed to delete object: ${key}`, err);
    }
  }

  async deleteObjects(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      await this.executeWithRetry(async () => {
        const command = new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: {
            Objects: keys.map((key) => ({ Key: key })),
          },
        });

        await this.s3Client.send(command);
      });

      this.logger.log(`Deleted ${keys.length} objects`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to delete objects: ${err.message}`);
      throw new StorageException('Failed to delete objects', err);
    }
  }

  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1);
    } catch {
      return null;
    }
  }

  private validateFile(file: IncidentImageFile): void {
    this.validateMimeType(file.mimetype);
    this.validateFileSize(file.size);
    this.validateFileName(file.originalname);
  }

  private validateMimeType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType as any)) {
      throw new InvalidFileException(
        `Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private validateFileSize(size: number): void {
    if (size > MAX_FILE_SIZE) {
      throw new InvalidFileException(
        `File size exceeds limit. Max: ${MAX_FILE_SIZE / 1024 / 1024}MB, Received: ${size / 1024 / 1024}MB`,
      );
    }
  }

  private validateFileName(fileName: string): void {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

    if (EXECUTABLE_EXTENSIONS.includes(extension)) {
      throw new InvalidFileException(`Executable files are not allowed: ${extension}`);
    }
  }

  private generateFileKey(fileName: string, folder: StorageFolder): string {
    const extension = fileName.split('.').pop() || 'jpg';
    const uuid = randomUUID();
    return `${folder}/${uuid}.${extension}`;
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.maxRetries - 1) {
          const delay = 1000 * Math.pow(2, attempt);
          this.logger.warn(`Retry attempt ${attempt + 1} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
