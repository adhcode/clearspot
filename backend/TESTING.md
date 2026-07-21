# Testing Guide

## Setup API Keys

### 1. Google Gemini AI ✅ WORKING

Get your API key: https://aistudio.google.com/app/apikey

Add to `.env`:
```bash
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-flash-latest  # This model works with free tier!
```

**Status**: ✅ Integration working with `gemini-flash-latest`
- SDK updated to v0.24.1
- Correctly hits v1beta API
- AI analysis functioning properly

Restart server after updating `.env`:
```bash
pnpm start:dev
```

### 2. Cloudflare R2

Create R2 bucket: https://dash.cloudflare.com/r2

Add to `.env`:
```bash
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=clearspot-uploads
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
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
    "imageUrls": [],
    "guestEmail": "reporter@example.com"
  }' | jq
```

Expected with working Gemini:
```json
{
  "severity": "CRITICAL",
  "aiConfidence": 0.9,
  "aiRecommendation": "Waste Type: Toxic/Hazardous\nEstimated Size: Large..."
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
    "notes": "Verified severity. Approved for cleanup."
  }' | jq
```

## AI Analysis Examples

Test scenarios showing AI correctly categorizes severity:

**Critical** (toxic waste near school):
```bash
curl -s -X POST http://localhost:3000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Critical toxic waste near elementary school",
    "description": "Chemical barrels leaking near playground. Children at risk",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "address": "School Road, Lagos",
    "imageUrls": [],
    "guestEmail": "alert@example.com"
  }' | jq '{severity, aiConfidence}'
```
Result: `{"severity": "CRITICAL", "aiConfidence": 1}`

**Low** (small household waste):
```bash
curl -s -X POST http://localhost:3000/api/v1/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Small household garbage pile",
    "description": "Few bags of household trash on street corner",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "address": "Residential Street, Lagos",
    "imageUrls": [],
    "guestEmail": "resident@example.com"
  }' | jq '{severity, aiConfidence}'
```
Result: `{"severity": "LOW", "aiConfidence": 0.95}`

## Without Working Gemini Key

System gracefully handles Gemini failures:
- **AI Analysis**: Returns null, logs error
- **Incident Creation**: Continues successfully  
- **Severity**: Defaults to MEDIUM
- **No crashes**: Requests complete normally

Both integrations are optional for development.
