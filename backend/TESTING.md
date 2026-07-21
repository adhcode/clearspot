# Testing Guide

## Setup API Keys

### 1. Google Gemini AI

Get your API key: https://aistudio.google.com/app/apikey

Add to `.env`:
```bash
GEMINI_API_KEY=AIzaSy...
```

### 2. Cloudflare R2

Create R2 bucket: https://dash.cloudflare.com/r2

Add to `.env`:
```bash
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_ENDPOINT="https://16cc8107acc603b178f89fa0f8bc588f.r2.cloudflarestorage.com"
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=clearspot-images
R2_PUBLIC_URL=https://pub-23f5918c86e34af48b16d36b79a1a6a2.r2.dev
```

Restart server after updating `.env`:
```bash
pnpm start:dev
```

## Test Endpoints

### 1. Storage (Upload URLs)

```bash
curl -X POST http://localhost:3000/api/v1/storage/upload-urls \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"fileName": "photo.jpg", "contentType": "image/jpeg"}
    ]
  }' | jq
```

### 2. Incident with AI Analysis

```bash
curl -X POST http://localhost:3000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Toxic waste dump near residential area",
    "description": "Chemical drums and industrial waste dumped in vacant lot. Strong chemical smell, potential health hazard",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "address": "Ikeja, Lagos",
    "imageUrls": ["https://example.com/image1.jpg"],
    "guestEmail": "reporter@example.com"
  }' | jq '{title, severity, aiConfidence, aiRecommendation}'
```

Expected with AI:
```json
{
  "title": "...",
  "severity": "CRITICAL",
  "aiConfidence": 0.9,
  "aiRecommendation": "Immediate hazmat response required..."
}
```

### 3. List Incidents

```bash
curl 'http://localhost:3000/api/v1/incidents?page=1&limit=10' | jq
```

### 4. Officer Review

```bash
# Login as officer
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"officer@clearspot.com","password":"Officer@123"}' | jq -r '.accessToken')

# Review incident
curl -X POST http://localhost:3000/api/v1/incidents/{incident-id}/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "decision": "APPROVED",
    "notes": "Verified severity assessment. Approved for immediate cleanup."
  }' | jq
```

## Verify Integration

### Check Logs

Watch server logs for:
```
[GeminiService] Analyzed incident: ... - Severity: HIGH, Confidence: 0.85
[StorageService] Generated upload URL for: incidents/uuid.jpg
```

### AI Analysis Quality

Test with different scenarios:
- **Small household waste** → Should get LOW
- **Construction debris** → Should get MEDIUM
- **Near school/waterway** → Should get HIGH
- **Chemical/toxic** → Should get CRITICAL

## Without API Keys

System works without keys:
- **Storage**: Returns mock presigned URLs (won't upload)
- **AI**: Defaults to MEDIUM severity, logs warning

Both are optional for development testing.
