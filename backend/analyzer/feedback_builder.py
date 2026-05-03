"""Human-readable feedback generation from scoring results.

Generates specific, data-driven feedback based on actual joint angle
measurements and the detected exercise type. Each observation references
the measured angle and what the ideal range should be.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from backend.models.feedback import FeedbackReport, ScoringResult

_JOINT_NAMES: Dict[str, str] = {
    "left_knee": "left knee",
    "right_knee": "right knee",
    "left_hip": "left hip",
    "right_hip": "right hip",
    "left_elbow": "left elbow",
    "right_elbow": "right elbow",
    "spine_alignment": "spine",
}


def _angle_feedback(joint: str, angle: float, lo: float, hi: float) -> Tuple[str, str]:
    """Generate specific positive/negative feedback for a joint.

    Returns (positive_text, negative_text). One will be used based on
    whether the joint is flagged or well-performed.
    """
    name = _JOINT_NAMES.get(joint, joint)
    mid = (lo + hi) / 2

    if "knee" in joint:
        if angle < lo:
            neg = f"Your {name} bent deeper than ideal (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°). Try not going quite as low — stop just at or above parallel."
        elif angle > hi:
            neg = f"Your {name} didn't bend enough (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°). Try to get a bit deeper on each rep for full range of motion."
        else:
            neg = f"Your {name} was slightly outside the target range (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°)."
        pos = f"Your {name} tracked well at {angle:.0f}° (target {lo:.0f}–{hi:.0f}°)."

    elif "hip" in joint:
        if angle < lo:
            neg = f"Your {name} flexed more than ideal (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°). Try keeping your chest a bit more upright and bracing your core."
        elif angle > hi:
            neg = f"Your {name} could hinge more (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°). Push your hips back a bit further to engage the posterior chain."
        else:
            neg = f"Your {name} was slightly outside the target range (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°)."
        pos = f"Good hip position — {name} averaged {angle:.0f}° (target {lo:.0f}–{hi:.0f}°)."

    elif "elbow" in joint:
        if angle < lo:
            neg = f"Your {name} bent more than needed (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°). Try controlling the movement a bit more on the way down."
        elif angle > hi:
            neg = f"Your {name} could bend more (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°). Try to get a fuller range of motion on each rep."
        else:
            neg = f"Your {name} was slightly outside the target range (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°)."
        pos = f"Your {name} moved through a solid range at {angle:.0f}° (target {lo:.0f}–{hi:.0f}°)."

    elif "spine" in joint:
        if angle < lo:
            neg = f"Your spine was a bit too upright for this exercise (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°). A slight forward lean is okay here."
        elif angle > hi:
            neg = f"Your spine leaned forward more than ideal (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°). Focus on bracing your core and keeping a more neutral back."
        else:
            neg = f"Your spine alignment was slightly off (avg {angle:.0f}°, target {lo:.0f}–{hi:.0f}°)."
        pos = f"Spine alignment looked good at {angle:.0f}° (target {lo:.0f}–{hi:.0f}°)."

    else:
        neg = f"Your {name} was outside the ideal range (avg {angle:.0f}°)."
        pos = f"Your {name} was within range at {angle:.0f}°."

    return pos, neg


class FeedbackBuilder:
    """Builds specific, data-driven feedback from scoring results."""

    def build(self, result: ScoringResult, exercise_name: str = "Unknown Exercise") -> FeedbackReport:
        """Build feedback with actual angle measurements in each observation."""

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

        # --- Score-level summary ---
        score = result.form_score
        num_flagged = len(result.flagged_joints)
        num_good = len(result.well_performed_joints)

        if score >= 90:
            positives.append(f"Excellent {exercise_name} form — {score}/100. Keep it up.")
        elif score >= 70:
            if num_flagged == 0:
                positives.append(f"Good {exercise_name} at {score}/100 — all joints in range. Tighten up consistency to push higher.")
            elif num_flagged == 1:
                positives.append(f"Solid {exercise_name} at {score}/100 — one area to focus on below.")
            else:
                positives.append(f"Decent {exercise_name} at {score}/100 — a couple of things to clean up.")
        elif score >= 40:
            if num_flagged == 0:
                positives.append(f"Your {exercise_name} scored {score}/100 — all joints in range. Consistency between reps is what's holding the score back.")
            elif num_flagged == 1:
                suggestions.append(f"Your {exercise_name} scored {score}/100 — one area to fix below.")
            else:
                suggestions.append(f"Your {exercise_name} scored {score}/100 — {num_flagged} areas need attention. See the specific fixes below.")
        else:
            suggestions.append(f"Your {exercise_name} scored {score}/100. Check the specific areas below — working on them one at a time will make a big difference.")

        # --- Joint-specific feedback with actual numbers ---
        from backend.analyzer.exercise_profiles import EXERCISE_PROFILES
        ideal_ranges = EXERCISE_PROFILES.get(exercise_name.lower().replace(" ", "_").replace("-", "_"), {})

        for joint in result.well_performed_joints:
            angle = result.angle_summaries.get(joint)
            if angle is not None and joint in ideal_ranges:
                lo, hi = ideal_ranges[joint]
                pos, _ = _angle_feedback(joint, angle, lo, hi)
                positives.append(pos)

        for joint in result.flagged_joints:
            angle = result.angle_summaries.get(joint)
            if angle is not None and joint in ideal_ranges:
                lo, hi = ideal_ranges[joint]
                _, neg = _angle_feedback(joint, angle, lo, hi)
                suggestions.append(neg)

        # --- Consistency feedback ---
        # If we have angle summaries, check for left-right imbalances
        for side_pair in [("left_knee", "right_knee"), ("left_hip", "right_hip"), ("left_elbow", "right_elbow")]:
            left_angle = result.angle_summaries.get(side_pair[0])
            right_angle = result.angle_summaries.get(side_pair[1])
            if left_angle is not None and right_angle is not None:
                diff = abs(left_angle - right_angle)
                joint_type = side_pair[0].split("_")[1]
                if diff > 15:
                    suggestions.append(
                        f"Your left and right {joint_type} differ by {diff:.0f}° — "
                        f"this imbalance increases injury risk. Focus on moving both sides evenly."
                    )
                elif diff > 8:
                    suggestions.append(
                        f"Slight {joint_type} imbalance ({diff:.0f}° difference between sides). "
                        f"Try to keep both sides more symmetrical."
                    )

        # --- If all joints are good but score is still low, explain why ---
        if num_flagged == 0 and score < 80 and not any("consistency" in s.lower() for s in suggestions):
            suggestions.append(
                "All your joint angles were in range, but your rep-to-rep consistency "
                "brought the score down. Focus on making each rep look identical — "
                "same depth, same speed, same path."
            )

        # --- Fallbacks ---
        if not positives:
            positives.append("You took the time to record and check your form — that's a great habit to build.")
        if not suggestions:
            suggestions.append("Looking solid — keep recording regularly to track your progress.")

        return FeedbackReport(
            form_score=result.form_score,
            positive_observations=positives,
            improvement_suggestions=suggestions,
            warning=None,
            detected_exercise=exercise_name,
        )
