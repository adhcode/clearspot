# Storage Integration (Cloudflare R2)

## Overview

Presigned URL-based file upload system for secure, direct-to-storage uploads.

## Upload Flow

```
1. Client requests upload URLs
   POST /storage/upload-urls
   
2. Server generates presigned URLs
   Returns: uploadUrl, fileKey, publicUrl
   
3. Client uploads directly to R2
   PUT {uploadUrl} with file binary
   
4. Client submits incident with publicUrls
   POST /incidents with publicUrl array
```

## API

### Generate Upload URLs

```bash
POST /api/v1/storage/upload-urls
```

**Request:**
```json
{
  "files": [
    {
      "fileName": "photo.jpg",
      "contentType": "image/jpeg"
    }
  ]
}
```

**Response:**
```json
[
  {
    "uploadUrl": "https://...presigned-url...",
    "fileKey": "incidents/uuid.jpg",
    "publicUrl": "https://bucket.r2.dev/incidents/uuid.jpg"
  }
]
```

### Upload File

```bash
PUT {uploadUrl}
Content-Type: image/jpeg
Body: <binary file data>
```

### Submit Incident

```bash
POST /api/v1/incidents
{
  "title": "...",
  "imageUrls": ["https://bucket.r2.dev/incidents/uuid.jpg"]
}
```

## Configuration

Required env variables:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

## Limits

- Max 5 files per request
- Presigned URLs expire after 1 hour
- Supported: images (jpg, png, webp)

## Security

- Presigned URLs are time-limited
- Direct upload (no server proxy)
- Public bucket for read access
- File keys use UUIDs (no guessing)
