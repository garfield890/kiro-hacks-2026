"""Heuristic form scoring based on joint-angle analysis.

This module provides the ``FormScorer`` class which takes a sequence of
per-frame pose landmarks, computes angle time-series for key body joints,
compares them against ideal ranges, and produces a ``ScoringResult``.

The angle computation uses the standard three-point vector formula::

    angle(A, B, C) = arccos( (BA · BC) / (|BA| × |BC|) )

where **B** is the vertex joint and **A**, **C** are the adjacent joints.

Requirements: 4.3, 5.1
"""

from __future__ import annotations

import math
from typing import Dict, List, Tuple

from backend.models.feedback import FrameLandmarks, ScoringResult

# ---------------------------------------------------------------------------
# MediaPipe BlazePose landmark indices
# ---------------------------------------------------------------------------
_LEFT_SHOULDER = 11
_RIGHT_SHOULDER = 12
_LEFT_ELBOW = 13
_RIGHT_ELBOW = 14
_LEFT_WRIST = 15
_RIGHT_WRIST = 16
_LEFT_HIP = 23
_RIGHT_HIP = 24
_LEFT_KNEE = 25
_RIGHT_KNEE = 26
_LEFT_ANKLE = 27
_RIGHT_ANKLE = 28

# ---------------------------------------------------------------------------
# Ideal angle ranges (degrees) — exercise-agnostic heuristics for the MVP.
# Each tuple is (min_angle, max_angle).
# ---------------------------------------------------------------------------
_IDEAL_RANGES: Dict[str, Tuple[float, float]] = {
    "left_knee": (80.0, 180.0),
    "right_knee": (80.0, 180.0),
    "left_hip": (70.0, 180.0),
    "right_hip": (70.0, 180.0),
    "left_elbow": (30.0, 180.0),
    "right_elbow": (30.0, 180.0),
    "spine_alignment": (0.0, 15.0),  # vertical deviation in degrees
}

# ---------------------------------------------------------------------------
# Joint definitions: (point_A_index, vertex_B_index, point_C_index)
# ---------------------------------------------------------------------------
_JOINT_TRIPLETS: Dict[str, Tuple[int, int, int]] = {
    "left_knee": (_LEFT_HIP, _LEFT_KNEE, _LEFT_ANKLE),
    "right_knee": (_RIGHT_HIP, _RIGHT_KNEE, _RIGHT_ANKLE),
    "left_hip": (_LEFT_SHOULDER, _LEFT_HIP, _LEFT_KNEE),
    "right_hip": (_RIGHT_SHOULDER, _RIGHT_HIP, _RIGHT_KNEE),
    "left_elbow": (_LEFT_SHOULDER, _LEFT_ELBOW, _LEFT_WRIST),
    "right_elbow": (_RIGHT_SHOULDER, _RIGHT_ELBOW, _RIGHT_WRIST),
}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

Point3D = Tuple[float, float, float]


def compute_angle(a: Point3D, b: Point3D, c: Point3D) -> float:
    """Compute the angle at vertex **B** formed by points A-B-C.

    Uses the formula::

        angle = arccos( (BA · BC) / (|BA| × |BC|) )

    Args:
        a: 3-D coordinates of the first endpoint.
        b: 3-D coordinates of the vertex (middle point).
        c: 3-D coordinates of the second endpoint.

    Returns:
        The angle in degrees, in the range [0, 180].  Returns 0.0 when
        either vector BA or BC has zero length (degenerate case).
    """
    ba = (a[0] - b[0], a[1] - b[1], a[2] - b[2])
    bc = (c[0] - b[0], c[1] - b[1], c[2] - b[2])

    dot = ba[0] * bc[0] + ba[1] * bc[1] + ba[2] * bc[2]
    mag_ba = math.sqrt(ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2)
    mag_bc = math.sqrt(bc[0] ** 2 + bc[1] ** 2 + bc[2] ** 2)

    if mag_ba == 0.0 or mag_bc == 0.0:
        return 0.0

    # Clamp to [-1, 1] to guard against floating-point drift.
    cosine = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cosine))


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _extractPoint(landmarks: List[Tuple[float, float, float, float]], index: int) -> Point3D:
    """Extract the (x, y, z) coordinates from a landmark tuple.

    Args:
        landmarks: Full list of 33 BlazePose landmark tuples (x, y, z, visibility).
        index: Landmark index to extract.

    Returns:
        A 3-tuple of (x, y, z).
    """
    lm = landmarks[index]
    return (lm[0], lm[1], lm[2])


def _computeSpineDeviation(landmarks: List[Tuple[float, float, float, float]]) -> float:
    """Compute the spine alignment deviation in degrees.

    Spine alignment is measured as the angle between the vector from the
    hip midpoint to the shoulder midpoint and the vertical axis (positive
    Y direction in normalised coordinates, where Y increases downward in
    MediaPipe).  A perfectly upright torso yields 0°.

    Args:
        landmarks: Full list of 33 BlazePose landmark tuples.

    Returns:
        Deviation angle in degrees in the range [0, 180].  Returns 0.0
        when the hip and shoulder midpoints coincide.
    """
    ls = _extractPoint(landmarks, _LEFT_SHOULDER)
    rs = _extractPoint(landmarks, _RIGHT_SHOULDER)
    lh = _extractPoint(landmarks, _LEFT_HIP)
    rh = _extractPoint(landmarks, _RIGHT_HIP)

    shoulder_mid = (
        (ls[0] + rs[0]) / 2.0,
        (ls[1] + rs[1]) / 2.0,
        (ls[2] + rs[2]) / 2.0,
    )
    hip_mid = (
        (lh[0] + rh[0]) / 2.0,
        (lh[1] + rh[1]) / 2.0,
        (lh[2] + rh[2]) / 2.0,
    )

    # Vector from hip midpoint to shoulder midpoint.
    spine_vec = (
        shoulder_mid[0] - hip_mid[0],
        shoulder_mid[1] - hip_mid[1],
        shoulder_mid[2] - hip_mid[2],
    )

    mag = math.sqrt(spine_vec[0] ** 2 + spine_vec[1] ** 2 + spine_vec[2] ** 2)
    if mag == 0.0:
        return 0.0

    # In MediaPipe normalised coordinates the Y axis points downward, so
    # the vertical (upward) direction is (0, -1, 0).  The deviation is the
    # angle between the spine vector and this vertical.
    vertical = (0.0, -1.0, 0.0)
    dot = spine_vec[0] * vertical[0] + spine_vec[1] * vertical[1] + spine_vec[2] * vertical[2]
    cosine = max(-1.0, min(1.0, dot / mag))
    return math.degrees(math.acos(cosine))


# ---------------------------------------------------------------------------
# FormScorer
# ---------------------------------------------------------------------------

class FormScorer:
    """Computes joint angles from landmark sequences and produces a form score.

    The scorer evaluates six joint angles (left/right knee, hip, elbow) plus
    spine alignment across all provided frames.  Each joint's mean angle is
    compared against an ideal range; joints within range are marked as
    well-performed, and those outside are flagged.

    The overall ``form_score`` is the percentage of joint checks that fall
    within their ideal range, scaled to [0, 100].
    """

    def score(self, frames: List[FrameLandmarks]) -> ScoringResult:
        """Score exercise form from a sequence of pose-landmark frames.

        Args:
            frames: Non-empty list of ``FrameLandmarks`` produced by
                ``PoseAnalyzer.analyze_video``.

        Returns:
            A ``ScoringResult`` with ``form_score`` in [0, 100], lists of
            flagged / well-performed joints, and per-joint mean angles.
        """
        if not frames:
            return ScoringResult(
                form_score=0,
                flagged_joints=list(_IDEAL_RANGES.keys()),
                well_performed_joints=[],
                angle_summaries={},
            )

        # Accumulate per-joint angle values across all frames.
        angle_series: Dict[str, List[float]] = {name: [] for name in _IDEAL_RANGES}

        for frame in frames:
            lm = frame.landmarks

            # Standard joint angles.
            for joint_name, (idx_a, idx_b, idx_c) in _JOINT_TRIPLETS.items():
                angle = compute_angle(
                    _extractPoint(lm, idx_a),
                    _extractPoint(lm, idx_b),
                    _extractPoint(lm, idx_c),
                )
                angle_series[joint_name].append(angle)

            # Spine alignment deviation.
            deviation = _computeSpineDeviation(lm)
            angle_series["spine_alignment"].append(deviation)

        # Compute mean angles and classify joints.
        angle_summaries: Dict[str, float] = {}
        flagged: List[str] = []
        well_performed: List[str] = []

        for joint_name, series in angle_series.items():
            if not series:
                flagged.append(joint_name)
                continue

            mean_angle = sum(series) / len(series)
            angle_summaries[joint_name] = round(mean_angle, 2)

            lo, hi = _IDEAL_RANGES[joint_name]
            if lo <= mean_angle <= hi:
                well_performed.append(joint_name)
            else:
                flagged.append(joint_name)

        # Score = percentage of joints within ideal range, clamped to [0, 100].
        total_joints = len(_IDEAL_RANGES)
        raw_score = (len(well_performed) / total_joints) * 100.0 if total_joints > 0 else 0.0
        form_score = max(0, min(100, int(round(raw_score))))

        return ScoringResult(
            form_score=form_score,
            flagged_joints=flagged,
            well_performed_joints=well_performed,
            angle_summaries=angle_summaries,
        )
