# Gemini AI Integration

## Overview

Automated incident severity assessment using Google Gemini 1.5 Flash.

## Features

- Analyzes incident title, description, and location
- Assigns severity: LOW, MEDIUM, HIGH, CRITICAL
- Provides confidence score (0-1)
- Generates officer recommendations
- Graceful fallback when not configured

## Configuration

Add to `.env`:
```
GEMINI_API_KEY=your-api-key-here
```

Get API key: https://aistudio.google.com/app/apikey

## How It Works

When an incident is created:
1. Service calls Gemini with incident details
2. AI analyzes severity based on:
   - Waste volume/scale
   - Waste type (household, construction, toxic)
   - Location impact (residential, commercial, waterway)
   - Health/environmental risks
   - Cleanup urgency
3. Returns structured analysis
4. System stores severity, confidence, and recommendation

## Severity Guidelines

- **LOW**: Small household waste, easy cleanup
- **MEDIUM**: Moderate accumulation, requires truck/crew
- **HIGH**: Large-scale dumping, potential health hazard
- **CRITICAL**: Toxic/hazardous materials, immediate action

## Without API Key

When `GEMINI_API_KEY` is not set:
- Defaults to MEDIUM severity
- `aiConfidence` and `aiRecommendation` are null
- Warning logged on startup
- Officers manually assess severity

## Example Analysis

**Input:**
```
Title: Massive construction waste dump near school
Description: Concrete debris, metal scraps next to elementary school
Location: Ikeja, Lagos State
```

**Output:**
```json
{
  "severity": "HIGH",
  "confidence": 0.85,
  "recommendation": "Immediate cleanup required due to proximity to school and safety hazard from metal scraps",
  "reasoning": "Large construction waste near children poses injury risk"
}
```

## Testing

Set your API key and create an incident to see AI analysis in action.
