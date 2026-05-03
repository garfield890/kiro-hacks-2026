---
inclusion: manual
---

# Tech Stack Reference

## Frontend
- Framework: React 19 (Vite 8, port 4556)
- Styling: Tailwind CSS v4
- Routing: React Router v6
- Fonts: Inter (body), Space Grotesk (headings), Outfit (display)
- No build-time CSS — Tailwind via @tailwindcss/vite plugin

## Backend
- Runtime: Python 3.14
- Framework: FastAPI
- ASGI Server: Uvicorn
- Virtual env: `.venv/` (created with `python3.14 -m venv .venv`)

## AI / ML
- Pose Estimation: MediaPipe PoseLandmarker (BlazePose lite model)
- Exercise Classification: scikit-learn GradientBoostingClassifier
- Video Processing: OpenCV (with CLAHE glare reduction)
- Model file: `backend/analyzer/exercise_model.pkl` (~5 MB)

## Key Dependencies
- `fastapi`, `uvicorn`, `python-multipart` — API server
- `mediapipe` — pose landmark detection
- `opencv-python-headless` — video frame processing
- `scikit-learn` — exercise classifier
- `pydantic` — data models and validation

## Development
- Frontend dev: `npm run dev` (from root, proxies to backend)
- Backend dev: `.venv/bin/uvicorn backend.main:app --reload --reload-dir backend --port 8000`
- Train classifier: `.venv/bin/python -m backend.analyzer.train_classifier`
- Frontend port: 4556 (strict)
- Backend port: 8000
