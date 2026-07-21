import { IsString, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

class FileUploadRequest {
  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;
}

export class GenerateUploadUrlDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileUploadRequest)
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  files!: FileUploadRequest[];
}
