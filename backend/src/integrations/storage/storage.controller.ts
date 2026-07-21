import { Controller, Post, Body } from '@nestjs/common';
import { StorageService } from './storage.service';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { Public } from '@modules/auth/decorators/public.decorator';
import { StorageFolder } from './constants/file-validation.constants';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @Post('upload-urls')
  async generateUploadUrls(@Body() dto: GenerateUploadUrlDto) {
    return Promise.all(
      dto.files.map((file) =>
        this.storageService.generatePresignedUploadUrl(
          file.fileName,
          file.contentType,
          StorageFolder.INCIDENTS,
        ),
      ),
    );
  }
}
