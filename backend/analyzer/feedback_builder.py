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
    "left_knee": "Your left knee angle is off — this puts unnecessary stress on the joint. Fix it before adding load.",
    "right_knee": "Your right knee angle is off — this puts unnecessary stress on the joint. Fix it before adding load.",
    "left_hip": "Your left hip range of motion is poor. Work on hip mobility drills before your next session.",
    "right_hip": "Your right hip range of motion is poor. Work on hip mobility drills before your next session.",
    "left_elbow": "Your left elbow is unstable throughout the movement. Lock in your arm path.",
    "right_elbow": "Your right elbow is unstable throughout the movement. Lock in your arm path.",
    "spine_alignment": "Your spine is not staying neutral — this is a fast track to a back injury. Prioritize core bracing.",
}

# ---------------------------------------------------------------------------
# Score-range feedback
# ---------------------------------------------------------------------------
_SCORE_RANGES: List[Tuple[int, int, str, str]] = [
    # (min_score, max_score, positive_comment, suggestion_comment)
    (
        90, 100,
        "Genuinely strong form — you clearly know what you're doing.",
        "Stay disciplined. Even small lapses in consistency will show up over time.",
    ),
    (
        80, 89,
        "Solid form with room to tighten up.",
        "You're close to excellent — focus on the flagged joints to push past 90.",
    ),
    (
        60, 79,
        "Passable form, but several joints need serious attention.",
        "Slow down your reps significantly and prioritize control over speed or weight.",
    ),
    (
        40, 59,
        "Your form has significant issues that could lead to injury.",
        "Drop the weight substantially and drill the movement pattern with bodyweight first.",
    ),
    (
        20, 39,
        "You attempted the exercise, but your form needs a lot of work.",
        "Consider working with a coach or watching detailed form tutorials before continuing.",
    ),
    (
        0, 19,
        "You showed up and recorded yourself — that takes initiative.",
        "Your form is far from safe. Start from scratch with bodyweight basics and build up slowly.",
    ),
]

# ---------------------------------------------------------------------------
# Fallback messages (ensure the guarantee is always met)
# ---------------------------------------------------------------------------
_FALLBACK_POSITIVE = "You recorded yourself and checked your form — that's more than most people do."
_FALLBACK_SUGGESTION = "There's real work to do here. Record again, compare side-by-side, and fix one joint at a time."


class FeedbackBuilder:
    """Assembles a ``FeedbackReport`` from a ``ScoringResult``.

    The builder translates numeric scores, flagged joints, and
    well-performed joints into human-readable text.  It guarantees that
    every returned ``FeedbackReport`` contains at least one positive
    observation and at least one improvement suggestion.
    """

    def build(self, result: ScoringResult) -> FeedbackReport:
        """Build a human-readable feedback report from a scoring result.

        If no movement was detected, returns score 0 with only a warning
        and minimal placeholder text (no real feedback).

        Args:
            result: The ``ScoringResult`` produced by ``FormScorer.score``.

        Returns:
            A ``FeedbackReport`` with ``form_score``, a non-empty list of
            ``positive_observations``, and a non-empty list of
            ``improvement_suggestions``.
        """
        # --- No movement: score 0, warning only, no real feedback ---
        if result.low_movement:
            return FeedbackReport(
                form_score=0,
                positive_observations=["—"],
                improvement_suggestions=["—"],
                warning=(
                    "Not enough movement detected — it looks like you weren't "
                    "exercising for most of the video. Make sure you perform a "
                    "full exercise during the recording and try again."
                ),
            )

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
            warning=None,
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
