"""Exercise-specific ideal angle ranges built from real user data.

Profiles are centered on actual MediaPipe landmark angles observed
during real exercises, with margins to accommodate variation.
"""

from __future__ import annotations

from typing import Dict, Tuple

EXERCISE_PROFILES: Dict[str, Dict[str, Tuple[float, float]]] = {
    # ── Real data profiles (from user calibration) ──────
    "squat": {
        "left_knee": (70.0, 155.0),
        "right_knee": (80.0, 160.0),
        "left_hip": (80.0, 170.0),
        "right_hip": (80.0, 170.0),
        "left_elbow": (110.0, 175.0),
        "right_elbow": (115.0, 180.0),
        "spine_alignment": (0.0, 45.0),
    },
    "calf_raise": {
        "left_knee": (130.0, 175.0),
        "right_knee": (130.0, 180.0),
        "left_hip": (130.0, 180.0),
        "right_hip": (125.0, 175.0),
        "left_elbow": (115.0, 170.0),
        "right_elbow": (120.0, 175.0),
        "spine_alignment": (5.0, 40.0),
    },
    "push_up": {
        "left_knee": (120.0, 180.0),
        "right_knee": (120.0, 180.0),
        "left_hip": (110.0, 180.0),
        "right_hip": (115.0, 180.0),
        "left_elbow": (100.0, 180.0),
        "right_elbow": (100.0, 180.0),
        "spine_alignment": (55.0, 140.0),
    },
    "row": {
        "left_knee": (105.0, 170.0),
        "right_knee": (105.0, 170.0),
        "left_hip": (80.0, 150.0),
        "right_hip": (85.0, 155.0),
        "left_elbow": (130.0, 180.0),
        "right_elbow": (135.0, 180.0),
        "spine_alignment": (30.0, 80.0),
    },
    "curl": {
        "left_knee": (110.0, 170.0),
        "right_knee": (115.0, 175.0),
        "left_hip": (140.0, 180.0),
        "right_hip": (140.0, 180.0),
        "left_elbow": (80.0, 145.0),
        "right_elbow": (80.0, 145.0),
        "spine_alignment": (0.0, 30.0),
    },
    "tricep_extension": {
        "left_knee": (110.0, 165.0),
        "right_knee": (110.0, 165.0),
        "left_hip": (140.0, 180.0),
        "right_hip": (140.0, 180.0),
        "left_elbow": (75.0, 165.0),
        "right_elbow": (75.0, 165.0),
        "spine_alignment": (0.0, 30.0),
    },
    "lateral_raise": {
        "left_knee": (110.0, 170.0),
        "right_knee": (115.0, 175.0),
        "left_hip": (140.0, 180.0),
        "right_hip": (135.0, 180.0),
        "left_elbow": (100.0, 160.0),
        "right_elbow": (95.0, 155.0),
        "spine_alignment": (0.0, 30.0),
    },
    "plank": {
        "left_knee": (140.0, 180.0),
        "right_knee": (140.0, 180.0),
        "left_hip": (135.0, 180.0),
        "right_hip": (145.0, 180.0),
        "left_elbow": (110.0, 170.0),
        "right_elbow": (125.0, 180.0),
        "spine_alignment": (50.0, 100.0),
    },
    "crunch": {
        "left_knee": (65.0, 140.0),
        "right_knee": (80.0, 150.0),
        "left_hip": (85.0, 165.0),
        "right_hip": (75.0, 150.0),
        "left_elbow": (60.0, 145.0),
        "right_elbow": (60.0, 155.0),
        "spine_alignment": (95.0, 160.0),
    },

    # ── Synthetic profiles (no real data yet) ───────────
    "deadlift": {
        "left_knee": (120.0, 175.0),
        "right_knee": (120.0, 175.0),
        "left_hip": (50.0, 130.0),
        "right_hip": (50.0, 130.0),
        "left_elbow": (160.0, 180.0),
        "right_elbow": (160.0, 180.0),
        "spine_alignment": (0.0, 18.0),
    },
    "hip_thrust": {
        "left_knee": (75.0, 115.0),
        "right_knee": (75.0, 115.0),
        "left_hip": (110.0, 180.0),
        "right_hip": (110.0, 180.0),
        "left_elbow": (70.0, 150.0),
        "right_elbow": (70.0, 150.0),
        "spine_alignment": (0.0, 25.0),
    },
    "overhead_press": {
        "left_knee": (160.0, 180.0),
        "right_knee": (160.0, 180.0),
        "left_hip": (160.0, 180.0),
        "right_hip": (160.0, 180.0),
        "left_elbow": (70.0, 180.0),
        "right_elbow": (70.0, 180.0),
        "spine_alignment": (0.0, 12.0),
    },
    "bench_press": {
        "left_knee": (75.0, 115.0),
        "right_knee": (75.0, 115.0),
        "left_hip": (75.0, 135.0),
        "right_hip": (75.0, 135.0),
        "left_elbow": (50.0, 180.0),
        "right_elbow": (50.0, 180.0),
        "spine_alignment": (0.0, 30.0),
    },
    "pull_up": {
        "left_knee": (90.0, 170.0),
        "right_knee": (90.0, 170.0),
        "left_hip": (155.0, 180.0),
        "right_hip": (155.0, 180.0),
        "left_elbow": (30.0, 175.0),
        "right_elbow": (30.0, 175.0),
        "spine_alignment": (0.0, 15.0),
    },
    "lat_pulldown": {
        "left_knee": (75.0, 115.0),
        "right_knee": (75.0, 115.0),
        "left_hip": (75.0, 115.0),
        "right_hip": (75.0, 115.0),
        "left_elbow": (30.0, 180.0),
        "right_elbow": (30.0, 180.0),
        "spine_alignment": (0.0, 18.0),
    },

    # ── Fallback ────────────────────────────────────────
    "unknown": {
        "left_knee": (155.0, 180.0),
        "right_knee": (155.0, 180.0),
        "left_hip": (160.0, 180.0),
        "right_hip": (160.0, 180.0),
        "left_elbow": (155.0, 180.0),
        "right_elbow": (155.0, 180.0),
        "spine_alignment": (0.0, 8.0),
    },
}

EXERCISE_LABELS = sorted([k for k in EXERCISE_PROFILES if k != "unknown"])

EXERCISE_DISPLAY_NAMES: Dict[str, str] = {
    "squat": "Squat",
    "calf_raise": "Calf Raise",
    "push_up": "Push-Up",
    "row": "Bent-Over Row",
    "curl": "Curl",
    "tricep_extension": "Tricep Extension",
    "lateral_raise": "Lateral Raise",
    "plank": "Plank",
    "crunch": "Crunch",
    "deadlift": "Deadlift",
    "hip_thrust": "Hip Thrust",
    "overhead_press": "Overhead Press",
    "bench_press": "Bench Press",
    "pull_up": "Pull-Up",
    "lat_pulldown": "Lat Pulldown",
    "unknown": "No Exercise Detected",
}
