# Storage Integration (Cloudflare R2)

## Upload Flow

```
1. Request upload URLs: POST /storage/upload-urls
2. Upload files directly to R2 using presigned URLs
3. Submit incident with public URLs
```

## Generate Upload URLs

```bash
POST /api/v1/storage/upload-urls
{
  "files": [
    {"fileName": "photo.jpg", "contentType": "image/jpeg"}
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

## Upload to R2

```bash
PUT {uploadUrl}
Content-Type: image/jpeg
Body: <binary>
```

## Submit Incident

```bash
POST /api/v1/incidents
{
  "imageUrls": ["https://bucket.r2.dev/incidents/uuid.jpg"]
}
```

## Config

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

## Limits

- Max 5 files per request
- Presigned URLs expire in 1 hour
