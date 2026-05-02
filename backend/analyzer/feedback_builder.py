"""Human-readable feedback generation from scoring results.

This module provides the ``FeedbackBuilder`` class which converts a raw
``ScoringResult`` (numeric score, flagged joints, well-performed joints)
into a ``FeedbackReport`` containing natural-language observations and
actionable improvement suggestions.

The builder guarantees that every report contains **at least one** positive
observation and **at least one** improvement suggestion, regardless of the
input.

Requirements: 5.1, 5.2, 5.3
"""

from __future__ import annotations

from typing import Dict, List, Tuple

from backend.models.feedback import FeedbackReport, ScoringResult

# ---------------------------------------------------------------------------
# Human-readable joint display names
# ---------------------------------------------------------------------------
_JOINT_DISPLAY_NAMES: Dict[str, str] = {
    "left_knee": "left knee",
    "right_knee": "right knee",
    "left_hip": "left hip",
    "right_hip": "right hip",
    "left_elbow": "left elbow",
    "right_elbow": "right elbow",
    "spine_alignment": "spine alignment",
}

# ---------------------------------------------------------------------------
# Per-joint positive / negative feedback templates
# ---------------------------------------------------------------------------
_POSITIVE_TEMPLATES: Dict[str, str] = {
    "left_knee": "Your left knee angle was well controlled throughout the movement.",
    "right_knee": "Your right knee angle was well controlled throughout the movement.",
    "left_hip": "Your left hip maintained a good range of motion.",
    "right_hip": "Your right hip maintained a good range of motion.",
    "left_elbow": "Your left elbow positioning was solid and consistent.",
    "right_elbow": "Your right elbow positioning was solid and consistent.",
    "spine_alignment": "Your spine stayed well aligned during the exercise.",
}

_SUGGESTION_TEMPLATES: Dict[str, str] = {
    "left_knee": "Focus on keeping your left knee angle within a comfortable range to protect the joint.",
    "right_knee": "Focus on keeping your right knee angle within a comfortable range to protect the joint.",
    "left_hip": "Try to improve your left hip mobility for a fuller range of motion.",
    "right_hip": "Try to improve your right hip mobility for a fuller range of motion.",
    "left_elbow": "Work on stabilizing your left elbow position throughout the movement.",
    "right_elbow": "Work on stabilizing your right elbow position throughout the movement.",
    "spine_alignment": "Pay attention to keeping your spine straight and avoid leaning to one side.",
}

# ---------------------------------------------------------------------------
# Score-range feedback
# ---------------------------------------------------------------------------
_SCORE_RANGES: List[Tuple[int, int, str, str]] = [
    # (min_score, max_score, positive_comment, suggestion_comment)
    (
        90, 100,
        "Excellent overall form — keep up the great work!",
        "To maintain your high level, consider recording regularly to track consistency.",
    ),
    (
        75, 89,
        "Good form overall with solid fundamentals.",
        "Small adjustments can take your form from good to great.",
    ),
    (
        50, 74,
        "You showed decent control during parts of the exercise.",
        "Slow down the movement and focus on controlled repetitions to improve your score.",
    ),
    (
        25, 49,
        "You completed the exercise, which is a positive first step.",
        "Consider reducing the weight or resistance and focusing on proper technique.",
    ),
    (
        0, 24,
        "Great effort getting started with form tracking!",
        "Start with bodyweight exercises to build a strong movement foundation before adding load.",
    ),
]

# ---------------------------------------------------------------------------
# Fallback messages (ensure the guarantee is always met)
# ---------------------------------------------------------------------------
_FALLBACK_POSITIVE = "You completed the exercise and took the time to check your form — that's a great habit."
_FALLBACK_SUGGESTION = "Keep practicing and record yourself regularly to track your improvement over time."


class FeedbackBuilder:
    """Assembles a ``FeedbackReport`` from a ``ScoringResult``.

    The builder translates numeric scores, flagged joints, and
    well-performed joints into human-readable text.  It guarantees that
    every returned ``FeedbackReport`` contains at least one positive
    observation and at least one improvement suggestion.
    """

    def build(self, result: ScoringResult) -> FeedbackReport:
        """Build a human-readable feedback report from a scoring result.

        Args:
            result: The ``ScoringResult`` produced by ``FormScorer.score``.

        Returns:
            A ``FeedbackReport`` with ``form_score``, a non-empty list of
            ``positive_observations``, and a non-empty list of
            ``improvement_suggestions``.
        """
        positives: List[str] = []
        suggestions: List[str] = []

        # --- Score-range commentary ---
        score_positive, score_suggestion = self._score_range_feedback(result.form_score)
        positives.append(score_positive)
        suggestions.append(score_suggestion)

        # --- Joint-specific observations ---
        for joint in result.well_performed_joints:
            template = _POSITIVE_TEMPLATES.get(joint)
            if template:
                positives.append(template)

        for joint in result.flagged_joints:
            template = _SUGGESTION_TEMPLATES.get(joint)
            if template:
                suggestions.append(template)

        # --- Guarantee at least one of each (defensive fallback) ---
        if not positives:
            positives.append(_FALLBACK_POSITIVE)
        if not suggestions:
            suggestions.append(_FALLBACK_SUGGESTION)

        return FeedbackReport(
            form_score=result.form_score,
            positive_observations=positives,
            improvement_suggestions=suggestions,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _score_range_feedback(self, score: int) -> Tuple[str, str]:
        """Return a (positive, suggestion) pair based on the score range.

        Args:
            score: The form score in [0, 100].

        Returns:
            A tuple of (positive_comment, suggestion_comment).
        """
        for min_score, max_score, positive, suggestion in _SCORE_RANGES:
            if min_score <= score <= max_score:
                return positive, suggestion

        # Should never happen if _SCORE_RANGES covers [0, 100], but be safe.
        return _FALLBACK_POSITIVE, _FALLBACK_SUGGESTION
