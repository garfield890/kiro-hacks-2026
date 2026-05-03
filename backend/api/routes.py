"""API routes for the Gym Form Checker backend.

Provides the ``POST /api/analyze`` endpoint that accepts a video clip,
validates it, runs pose analysis and scoring, and returns a feedback report.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3
"""

from __future__ import annotations

import logging
import os
import tempfile
from typing import Any, Dict, Optional

import cv2
from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.analyzer.feedback_builder import FeedbackBuilder
from backend.analyzer.form_scorer import FormScorer
from backend.analyzer.pose_analyzer import PoseAnalyzer
from backend.analyzer.exercise_classifier import ExerciseClassifier
from backend.analyzer.exercise_profiles import EXERCISE_PROFILES, EXERCISE_DISPLAY_NAMES
from backend.config import MIN_CLIP_DURATION_SEC, TEMP_UPLOAD_DIR
from backend.models.feedback import FeedbackReport
from backend.validation.video_validator import VideoValidationError, VideoValidator

logger = logging.getLogger(__name__)

router = APIRouter()

_validator = VideoValidator()
_pose_analyzer = PoseAnalyzer()
_form_scorer = FormScorer()
_feedback_builder = FeedbackBuilder()
_exercise_classifier = ExerciseClassifier()


def _getVideoDuration(file_path: str) -> float:
    """Compute the duration of a video file in seconds using OpenCV.

    Args:
        file_path: Path to the video file on disk.

    Returns:
        Duration in seconds. Returns 0.0 if the video cannot be read or
        has no frames.
    """
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        return 0.0

    try:
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps > 0 and frame_count > 0:
            return frame_count / fps
        return 0.0
    finally:
        cap.release()


@router.post("/api/analyze", response_model=FeedbackReport)
async def analyze(video_clip: UploadFile = File(...)) -> Dict[str, Any]:
    """Analyze an uploaded video clip and return a form feedback report.

    Accepts a ``multipart/form-data`` upload with field ``video_clip``.
    The file is validated for format and size, written to a temporary
    location, checked for minimum duration, then run through the full
    analysis pipeline (pose estimation → scoring → feedback generation).

    Returns:
        A JSON ``FeedbackReport`` on success (200).

    Raises:
        HTTPException 400: If the video fails format or size validation.
        HTTPException 422: If the clip is shorter than the minimum duration.
        HTTPException 500: If an unexpected error occurs during analysis.
    """
    tmp_path: Optional[str] = None

    try:
        # --- Read and validate the uploaded file ---
        file_bytes = await video_clip.read()
        content_type = video_clip.content_type or ""

        try:
            _validator.validate(file_bytes, content_type)
        except VideoValidationError as exc:
            raise HTTPException(status_code=400, detail=exc.message)

        # --- Write to a temp file for OpenCV processing ---
        suffix = _extensionForMime(content_type)
        fd, tmp_path = tempfile.mkstemp(suffix=suffix, dir=TEMP_UPLOAD_DIR)
        os.close(fd)

        with open(tmp_path, "wb") as f:
            f.write(file_bytes)

        # --- Check minimum clip duration ---
        duration = _getVideoDuration(tmp_path)
        if duration < MIN_CLIP_DURATION_SEC:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Video clip is too short ({duration:.1f}s). "
                    f"Minimum duration is {MIN_CLIP_DURATION_SEC} seconds."
                ),
            )

        # --- Run the analysis pipeline ---
        frames = _pose_analyzer.analyze_video(tmp_path)

        if not frames:
            raise HTTPException(
                status_code=422,
                detail="No human pose was detected in the video. Please ensure you are visible in the frame.",
            )

        # Classify the exercise type
        # First do a quick movement check with default ranges — if no
        # movement, skip the classifier entirely.
        quick_result = _form_scorer.score(frames)
        print(f"[ROUTE] Frames: {len(frames)}, low_movement: {quick_result.low_movement}, score: {quick_result.form_score}")
        if quick_result.low_movement:
            print("[ROUTE] Low movement detected — skipping classifier")
            exercise_name = "No Exercise Detected"
            report = _feedback_builder.build(quick_result, exercise_name=exercise_name)
            return report.model_dump()

        # Enough movement — classify the exercise
        print("[ROUTE] Enough movement — running classifier")
        exercise_type = _exercise_classifier.classify(frames)
        if exercise_type == "unknown":
            exercise_name = "No Exercise Detected"
            ideal_ranges = EXERCISE_PROFILES["unknown"]
        else:
            exercise_name = EXERCISE_DISPLAY_NAMES.get(exercise_type, exercise_type)
            ideal_ranges = EXERCISE_PROFILES.get(exercise_type, EXERCISE_PROFILES["unknown"])

        # Re-score with exercise-specific ranges
        scoring_result = _form_scorer.score(frames, ideal_ranges=ideal_ranges)

        report = _feedback_builder.build(scoring_result, exercise_name=exercise_name)

        return report.model_dump()

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error during video analysis")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred during analysis: {exc}",
        )
    finally:
        # --- Clean up the temp file ---
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                logger.warning("Failed to remove temp file: %s", tmp_path)


def _extensionForMime(content_type: str) -> str:
    """Map a MIME type to a file extension for the temp file.

    Args:
        content_type: The MIME type of the uploaded video.

    Returns:
        A file extension string including the leading dot.
    """
    mapping = {
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/quicktime": ".mov",
    }
    return mapping.get(content_type, ".mp4")
