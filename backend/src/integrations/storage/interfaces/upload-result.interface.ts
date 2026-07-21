export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface PresignedUploadUrl {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}
