# Implementation Plan: Gym Form Checker

## Overview

Build an MVP web application with a vanilla HTML/CSS/JS frontend and a Python (FastAPI) backend. The frontend handles camera access, countdown-based recording, and feedback display. The backend receives uploaded video clips, validates them, runs pose analysis via MediaPipe BlazePose, scores exercise form using heuristic joint-angle thresholds, and returns a structured feedback report.

Tasks are ordered so that foundational models and utilities come first, followed by backend analysis logic, then the API layer, then the frontend, and finally full integration wiring.

## Tasks

- [x] 1. Set up project structure and configuration
  - Create the directory layout: `backend/`, `backend/api/`, `backend/analyzer/`, `backend/models/`, `backend/validation/`, `frontend/`, `frontend/css/`, `frontend/js/`
  - Create `backend/config.py` with environment variable loading (`MAX_VIDEO_SIZE_MB`, `MIN_CLIP_DURATION_SEC`, `MAX_CLIP_DURATION_SEC`, `MEDIAPIPE_MODEL_COMPLEXITY`, `TEMP_UPLOAD_DIR`) and sensible defaults
  - Create `backend/requirements.txt` with pinned dependencies: `fastapi`, `uvicorn`, `python-multipart`, `mediapipe`, `opencv-python-headless`, `pydantic`
  - _Requirements: 6.4_

- [x] 2. Implement backend data models
  - [x] 2.1 Create Pydantic and dataclass models in `backend/models/feedback.py`
    - `FeedbackReport` (Pydantic): `form_score` (int, 0–100), `positive_observations` (list[str], min_length=1), `improvement_suggestions` (list[str], min_length=1)
    - `FrameLandmarks` (dataclass): `frame_index` (int), `landmarks` (list of 33 (x, y, z, visibility) tuples)
    - `ScoringResult` (dataclass): `form_score` (int), `flagged_joints` (list[str]), `well_performed_joints` (list[str]), `angle_summaries` (dict[str, float])
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 3. Implement video validation
  - [x] 3.1 Create `backend/validation/video_validator.py` with `VideoValidator` class
    - Define `SUPPORTED_MIME_TYPES` frozenset: `video/mp4`, `video/webm`, `video/quicktime`
    - Define `MAX_FILE_SIZE_BYTES` from config (default 100 MB)
    - Implement `validate(file_bytes, content_type)` that raises `VideoValidationError` for unsupported MIME types or oversized files
    - Create custom `VideoValidationError` exception class
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 3.2 Write property tests for VideoValidator
    - **Property 6: Unsupported MIME type is always rejected without processing**
    - **Property 7: Oversized file is always rejected without processing**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 4. Implement pose analysis engine
  - [x] 4.1 Create `backend/analyzer/pose_analyzer.py` with `PoseAnalyzer` class
    - Implement `analyze_video(video_path)` that opens video with OpenCV, runs MediaPipe BlazePose on each frame, and returns `list[FrameLandmarks]`
    - Handle frames where no pose is detected (skip or return empty landmarks)
    - Use `MEDIAPIPE_MODEL_COMPLEXITY` from config
    - _Requirements: 4.1, 4.3_

  - [x] 4.2 Create `backend/analyzer/form_scorer.py` with `FormScorer` class
    - Implement `compute_angle(A, B, C)` utility using the three-point vector formula
    - Implement `score(frames)` that computes angle time series for key joints (knee, hip, elbow, spine alignment), compares against ideal ranges, and returns a `ScoringResult` with `form_score` in [0, 100]
    - Key joints: left/right knee, left/right hip, left/right elbow, spine alignment
    - _Requirements: 4.3, 5.1_

  - [ ]* 4.3 Write property tests for FormScorer
    - **Property 3: Form score is always within the valid range [0, 100]**
    - **Validates: Requirements 5.1**

  - [ ]* 4.4 Write property test for joint angle symmetry
    - **Property 8: Joint angle computation is symmetric — compute_angle(A, B, C) == compute_angle(C, B, A) within 1e-9 degrees**
    - **Validates: Requirements 4.3**

  - [x] 4.5 Create `backend/analyzer/feedback_builder.py` with `FeedbackBuilder` class
    - Implement `build(result: ScoringResult) -> FeedbackReport` that maps score ranges and flagged/well-performed joints to human-readable text
    - Guarantee at least one positive observation and one improvement suggestion in all cases
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 4.6 Write property tests for FeedbackBuilder
    - **Property 4: FeedbackReport always contains at least one positive observation and one improvement suggestion**
    - **Validates: Requirements 5.2, 5.3**

- [x] 5. Checkpoint — Verify backend analysis pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the API layer
  - [x] 6.1 Create `backend/api/routes.py` with `POST /api/analyze` endpoint
    - Accept `multipart/form-data` with field `video_clip`
    - Read file bytes, run `VideoValidator.validate`
    - Write to temp file, compute duration with OpenCV, reject clips < `MIN_CLIP_DURATION_SEC` with 422
    - Run `PoseAnalyzer.analyze_video` → `FormScorer.score` → `FeedbackBuilder.build`
    - Return `FeedbackReport` as JSON (200), or appropriate error responses (400, 422, 500)
    - Clean up temp file in a `finally` block
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3_

  - [ ]* 6.2 Write property test for short clip rejection
    - **Property 2: Short clip is always rejected without invoking the analyzer**
    - **Validates: Requirements 4.5**

  - [x] 6.3 Create `backend/main.py` — FastAPI application entry point
    - Mount static file serving for the `frontend/` directory at `/`
    - Register the `/api/analyze` route
    - Configure CORS if needed for development
    - _Requirements: 4.1_

- [x] 7. Implement frontend — Camera and Recording
  - [x] 7.1 Create `frontend/index.html` — single-page app shell
    - Video preview element, overlay area for countdown, recording indicator, feedback section
    - Buttons: Open Camera, Close Camera, Start Recording, Cancel, Stop Recording, Record Again, Retry Analysis
    - Loading spinner area for analysis state
    - Accessible markup with ARIA labels
    - _Requirements: 1.1, 1.6, 2.1, 2.4, 3.3, 4.2, 4.4, 5.5_

  - [x] 7.2 Create `frontend/css/style.css`
    - Layout styles for video preview, overlay, buttons, feedback sections
    - Recording indicator (red dot + elapsed time)
    - Countdown overlay styling (large centered number)
    - Loading spinner styles
    - Responsive design for mobile use in a gym setting
    - _Requirements: 2.2, 3.2, 4.2_

  - [x] 7.3 Create `frontend/js/camera-manager.js` — `CameraManager` class
    - `open()`: call `getUserMedia({ video: true })`, attach stream to video element
    - `close()`: stop all tracks, clear `srcObject`
    - `getStream()`: return active `MediaStream` or null
    - Handle permission denied and no-device-found errors with descriptive messages
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 7.4 Create `frontend/js/recorder.js` — `Recorder` class
    - `startCountdown(onTick, onComplete, onCancel)`: 10-second countdown, fires `onTick` each second with remaining value, calls `onComplete` at zero
    - `cancelCountdown()`: clears interval, calls `onCancel`
    - `startRecording(onStop)`: create `MediaRecorder` with best supported MIME type (`video/mp4` → `video/webm;codecs=vp9` → `video/webm`), collect chunks
    - `stopRecording()`: stop `MediaRecorder`, assemble `Blob`
    - Auto-stop at 120 seconds via `setTimeout`
    - `getBlob()`: return recorded `Blob`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 7.5 Write property test for countdown behavior
    - **Property 1: Countdown fires exactly N ticks in descending order then completes**
    - **Validates: Requirements 2.2, 2.3, 2.5**

- [x] 8. Implement frontend — Upload and Feedback Display
  - [x] 8.1 Create `frontend/js/uploader.js` — `uploadVideo` function
    - Build `FormData` with field `video_clip` and the recorded `Blob`
    - POST to `/api/analyze` with `fetch`
    - Parse JSON response as `FeedbackReport`
    - Throw on HTTP errors or network failures with descriptive messages
    - _Requirements: 4.1, 4.4_

  - [x] 8.2 Create `frontend/js/feedback-ui.js` — `renderFeedback` and `clearFeedback` functions
    - `renderFeedback(report)`: populate DOM with Form_Score, positive observations list, improvement suggestions list in clearly labeled sections
    - `clearFeedback()`: clear the feedback section
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 8.3 Write property test for feedback rendering
    - **Property 5: Rendered feedback always contains all required labeled sections**
    - **Validates: Requirements 5.4**

- [x] 9. Wire frontend together — App state machine
  - [x] 9.1 Create `frontend/js/app.js` — top-level state machine
    - Implement states: IDLE → CAMERA_ACTIVE → COUNTDOWN → RECORDING → ANALYZING → FEEDBACK / ERROR
    - Wire `CameraManager`, `Recorder`, `uploadVideo`, `renderFeedback` together
    - Manage button visibility/enabled state based on current state
    - Handle all error transitions (camera errors, recording errors, upload errors, analysis errors)
    - Client-side validation: reject clips < 3 seconds before upload, check file size < 100 MB
    - Implement "Record Again" flow (FEEDBACK → CAMERA_ACTIVE)
    - Implement "Retry Analysis" flow (ERROR → re-submit same Blob)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 5.5, 6.1, 6.2, 6.3_

- [x] 10. Checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 11. Write integration tests
  - [ ]* 11.1 Write integration tests for the `/api/analyze` endpoint
    - Test: upload a clip < 3 seconds → expect 422
    - Test: upload a file > 100 MB → expect 400
    - Test: upload a valid 5-second clip with a visible person → expect 200 with well-formed `FeedbackReport`
    - Test: upload a file with unsupported MIME type → expect 400
    - _Requirements: 4.1, 4.5, 6.1, 6.2, 6.3_

- [x] 12. Final checkpoint — End-to-end readiness
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped — the user indicated testing can be done later
- Each task references specific requirement clauses for traceability
- Checkpoints are placed after the backend analysis pipeline and after full integration to catch issues incrementally
- The frontend uses vanilla JS (no build toolchain); the backend uses FastAPI with MediaPipe and OpenCV
- All configuration is environment-driven via `backend/config.py` — no hardcoded secrets
