---
inclusion: fileMatch
fileMatchPattern: "backend/api/**"
---

# API Conventions

## Endpoints
- `POST /api/analyze` — Upload a video clip for form analysis
  - Accepts: `multipart/form-data` with field `video_clip`
  - Returns: `FeedbackReport` JSON
  - Validates: MIME type, file size (100 MB max), clip duration (3–60s)

## Response Shape

Success (200):
```json
{
  "form_score": 78,
  "positive_observations": ["Your left knee tracked well at 113°..."],
  "improvement_suggestions": ["Your spine leaned forward more than ideal..."],
  "warning": null,
  "detected_exercise": "Squat"
}
```

Validation error (400):
```json
{ "detail": "Unsupported video format: image/png..." }
```

Too short (422):
```json
{ "detail": "Video clip is too short (1.2s). Minimum duration is 3 seconds." }
```

Server error (500):
```json
{ "detail": "An unexpected error occurred during analysis: ..." }
```

## Analysis Pipeline
1. Validate video (format, size)
2. Write to temp file, check duration
3. Run CLAHE preprocessing on each frame
4. Extract pose landmarks with MediaPipe
5. Quick movement check — if low movement, return early with warning
6. Classify exercise type with ML model
7. Score form using exercise-specific ideal angle ranges
8. Build constructive feedback report
9. Clean up temp file

## Configuration (Environment Variables)
- `MAX_VIDEO_SIZE_MB` (default: 100)
- `MIN_CLIP_DURATION_SEC` (default: 3)
- `MAX_CLIP_DURATION_SEC` (default: 60)
- `MEDIAPIPE_MODEL_COMPLEXITY` (default: 1)
- `TEMP_UPLOAD_DIR` (default: /tmp)
