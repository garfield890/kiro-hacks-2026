"""Data models for the Gym Form Checker analysis pipeline.

This module defines the core data structures used throughout the backend:
- FeedbackReport: the final output returned to the client via the API.
- FrameLandmarks: per-frame pose landmark data extracted by the PoseAnalyzer.
- ScoringResult: intermediate scoring output produced by the FormScorer.

Requirements: 5.1, 5.2, 5.3
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from pydantic import BaseModel, Field


class FeedbackReport(BaseModel):
    """Structured feedback returned to the user after video analysis.

    Attributes:
        form_score: Overall quality score for the user's exercise form (0–100).
        positive_observations: Things the user did well. Always contains at
            least one entry.
        improvement_suggestions: Actionable suggestions for improving form.
            Always contains at least one entry.
    """

    form_score: int = Field(..., ge=0, le=100, description="Overall form quality score (0–100)")
    positive_observations: list[str] = Field(
        ...,
        min_length=1,
        description="List of positive observations about the user's form",
    )
    improvement_suggestions: list[str] = Field(
        ...,
        min_length=1,
        description="List of actionable improvement suggestions",
    )
    warning: Optional[str] = Field(
        default=None,
        description="Optional warning message, e.g. when no exercise movement is detected",
    )


@dataclass
class FrameLandmarks:
    """Pose landmarks for a single video frame.

    Each landmark is a tuple of (x, y, z, visibility) representing one of the
    33 BlazePose body landmarks in normalised coordinates.

    Attributes:
        frame_index: Zero-based index of the frame within the video.
        landmarks: List of 33 landmark tuples, each containing
            (x, y, z, visibility) floats.
    """

    frame_index: int
    landmarks: list[tuple[float, float, float, float]]


@dataclass
class ScoringResult:
    """Intermediate result produced by the FormScorer before human-readable
    text is generated.

    Attributes:
        form_score: Numeric form quality score in the range [0, 100].
        flagged_joints: Names of joints that fell outside ideal angle ranges.
        well_performed_joints: Names of joints that stayed within ideal ranges.
        angle_summaries: Mapping of joint name to its mean angle in degrees.
    """

    form_score: int
    flagged_joints: list[str] = field(default_factory=list)
    well_performed_joints: list[str] = field(default_factory=list)
    angle_summaries: dict[str, float] = field(default_factory=dict)
    low_movement: bool = False
