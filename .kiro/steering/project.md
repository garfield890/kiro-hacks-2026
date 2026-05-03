# Project Steering

## Overview
FormCheck is an AI-powered gym form checker web app. Users record themselves exercising (or upload a video), and the app analyzes their form using MediaPipe pose estimation and a Gradient Boosting exercise classifier, then provides constructive feedback.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS (port 4556)
- **Backend**: Python FastAPI (port 8000)
- **Pose Estimation**: MediaPipe BlazePose (PoseLandmarker tasks API)
- **Exercise Classification**: scikit-learn GradientBoostingClassifier
- **Video Processing**: OpenCV with CLAHE preprocessing

## Code Style
- Use 2-space indentation for JavaScript/JSX files
- Use 4-space indentation for Python files
- Always include JSDoc/docstring comments for public functions and classes
- Prefer `const` over `let` where possible; avoid `var`

## Naming Conventions
- Files: `kebab-case` (e.g., `camera-manager.js`, `form-scorer.py`)
- Classes: `PascalCase` (e.g., `FormScorer`, `ExerciseClassifier`)
- Functions and variables: `camelCase` (JS) or `snake_case` (Python)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_DURATION_SEC`)

## Git Workflow
- Branch naming: `feature/<short-description>`, `fix/<short-description>`
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Always open a PR for review; never push directly to `main`

## Security
- Never commit secrets, API keys, or credentials — use environment variables
- All configuration loaded from env vars via `backend/config.py`
- Validate and sanitize all user inputs (video format, size, duration)

## UI Design Principles
- Light comes from the sky: top edges lighter, bottom edges darker
- Double whitespace for breathing room
- Text contrast: larger but lighter for hierarchy
- Underlines mean links; background color for hover effects only
- Constructive feedback tone — honest but encouraging, never harsh
