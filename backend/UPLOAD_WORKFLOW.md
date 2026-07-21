# Image Upload Workflow

## Complete Flow

### 1. Request Upload URLs

```bash
curl -X POST http://localhost:3000/api/v1/storage/upload-urls \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"fileName": "photo1.jpg", "contentType": "image/jpeg"},
      {"fileName": "photo2.jpg", "contentType": "image/jpeg"}
    ]
  }'
```

**Response:**
```json
[
  {
    "uploadUrl": "https://account.r2.cloudflarestorage.com/bucket/incidents/uuid1.jpg?X-Amz-...",
    "fileKey": "incidents/uuid1.jpg",
    "publicUrl": "https://bucket.r2.dev/incidents/uuid1.jpg"
  },
  {
    "uploadUrl": "https://account.r2.cloudflarestorage.com/bucket/incidents/uuid2.jpg?X-Amz-...",
    "fileKey": "incidents/uuid2.jpg",
    "publicUrl": "https://bucket.r2.dev/incidents/uuid2.jpg"
  }
]
```

### 2. Upload Files to R2

```bash
# Upload each file using its presigned URL
curl -X PUT "{uploadUrl}" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@photo1.jpg"

curl -X PUT "{uploadUrl}" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@photo2.jpg"
```

### 3. Submit Incident

```bash
curl -X POST http://localhost:3000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Illegal waste dump",
    "description": "Large pile of construction waste",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "address": "Lagos, Nigeria",
    "imageUrls": [
      "https://bucket.r2.dev/incidents/uuid1.jpg",
      "https://bucket.r2.dev/incidents/uuid2.jpg"
    ],
    "guestEmail": "reporter@example.com"
  }'
```

## Frontend Implementation

```typescript
async function submitIncidentWithImages(
  incident: IncidentData,
  imageFiles: File[]
): Promise<void> {
  // 1. Request upload URLs
  const uploadData = await fetch('/api/v1/storage/upload-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: imageFiles.map(f => ({
        fileName: f.name,
        contentType: f.type
      }))
    })
  }).then(r => r.json());

  // 2. Upload files directly to R2
  await Promise.all(
    uploadData.map((data, i) =>
      fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': imageFiles[i].type },
        body: imageFiles[i]
      })
    )
  );

  // 3. Submit incident with public URLs
  await fetch('/api/v1/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...incident,
      imageUrls: uploadData.map(d => d.publicUrl)
    })
  });
}
```

## React Native Example

```typescript
import * as FileSystem from 'expo-file-system';

async function uploadImage(imageUri: string): Promise<string> {
  // 1. Get upload URL
  const response = await fetch('/api/v1/storage/upload-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: [{ fileName: 'photo.jpg', contentType: 'image/jpeg' }]
    })
  });
  
  const [uploadData] = await response.json();

  // 2. Upload file
  await FileSystem.uploadAsync(uploadData.uploadUrl, imageUri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' }
  });

  return uploadData.publicUrl;
}
```

## Notes

- Upload URLs expire in 1 hour
- Max 5 images per incident
- Upload to R2 happens client-side (no backend bandwidth)
- Public URLs are permanent and can be used immediately
