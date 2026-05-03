"""Exercise type classifier using XGBoost on pose landmark features.

Takes the first N frames of landmarks, computes aggregate joint angle
features (mean, std, min, max per joint), and predicts the exercise type.
Runs in < 5ms on a single prediction — no noticeable latency.
"""

from __future__ import annotations

import logging
import os
import pickle
from typing import List, Optional

import numpy as np

from backend.analyzer.form_scorer import compute_angle, _extractPoint, _computeSpineDeviation, _JOINT_TRIPLETS
from backend.models.feedback import FrameLandmarks
from backend.analyzer.exercise_profiles import EXERCISE_LABELS

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "exercise_model.pkl")

# Number of frames to sample for classification (from the start of the video)
SAMPLE_FRAMES = 30


def extract_features(frames: List[FrameLandmarks]) -> Optional[np.ndarray]:
    """Extract aggregate joint angle features from a sequence of frames.

    Computes mean, std, min, max for each of the 6 joint angles plus
    spine alignment = 7 joints × 4 stats = 28 features.

    Args:
        frames: List of FrameLandmarks from the video.

    Returns:
        A 1-D numpy array of 31 features, or None if not enough data.
    """
    if len(frames) < 5:
        return None

    # Sample up to SAMPLE_FRAMES evenly spaced frames
    if len(frames) > SAMPLE_FRAMES:
        indices = np.linspace(0, len(frames) - 1, SAMPLE_FRAMES, dtype=int)
        sampled = [frames[i] for i in indices]
    else:
        sampled = frames

    joint_names = list(_JOINT_TRIPLETS.keys()) + ["spine_alignment"]
    angle_series = {name: [] for name in joint_names}

    for frame in sampled:
        lm = frame.landmarks
        for joint_name, (idx_a, idx_b, idx_c) in _JOINT_TRIPLETS.items():
            angle = compute_angle(
                _extractPoint(lm, idx_a),
                _extractPoint(lm, idx_b),
                _extractPoint(lm, idx_c),
            )
            angle_series[joint_name].append(angle)
        angle_series["spine_alignment"].append(_computeSpineDeviation(lm))

    features = []
    for name in joint_names:
        vals = np.array(angle_series[name])
        if len(vals) == 0:
            features.extend([0.0, 0.0, 0.0, 0.0])
        else:
            features.extend([
                float(np.mean(vals)),
                float(np.std(vals)),
                float(np.min(vals)),
                float(np.max(vals)),
            ])

    # Add left-right asymmetry features for paired joints
    # This helps distinguish squat (symmetric) from lunge (asymmetric)
    pairs = [
        ("left_knee", "right_knee"),
        ("left_hip", "right_hip"),
        ("left_elbow", "right_elbow"),
    ]
    for left, right in pairs:
        left_vals = np.array(angle_series[left])
        right_vals = np.array(angle_series[right])
        if len(left_vals) > 0 and len(right_vals) > 0:
            # Mean absolute difference between left and right per frame
            min_len = min(len(left_vals), len(right_vals))
            diffs = np.abs(left_vals[:min_len] - right_vals[:min_len])
            features.append(float(np.mean(diffs)))
        else:
            features.append(0.0)

    return np.array(features, dtype=np.float32)


class ExerciseClassifier:
    """Classifies exercise type from pose landmarks using a trained XGBoost model.

    Falls back to 'unknown' if the model file doesn't exist or
    prediction confidence is too low.
    """

    def __init__(self, confidence_threshold: float = 0.25):
        self.model = None
        self.confidence_threshold = confidence_threshold
        self._load_model()

    def _load_model(self):
        """Load the trained model from disk."""
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    self.model = pickle.load(f)
                print(f"[CLASSIFIER] Model loaded, n_features={self.model.n_features_in_}")
            except Exception as e:
                logger.warning("Failed to load exercise classifier: %s", e)
                self.model = None
        else:
            logger.warning("No exercise classifier model found at %s — will default to 'unknown'", MODEL_PATH)

    def classify(self, frames: List[FrameLandmarks]) -> str:
        """Predict the exercise type from landmark frames.

        Args:
            frames: List of FrameLandmarks from the video.

        Returns:
            Exercise name string (e.g. 'squat', 'deadlift') or 'unknown'.
        """
        # Reload model from disk to pick up retraining without restart
        self._load_model()

        if self.model is None:
            return "unknown"

        features = extract_features(frames)
        if features is None:
            return "unknown"

        try:
            X = features.reshape(1, -1)
            proba = self.model.predict_proba(X)[0]
            max_idx = int(np.argmax(proba))
            max_conf = float(proba[max_idx])

            # Log top 3 predictions for debugging
            top_indices = np.argsort(proba)[::-1][:3]
            top_preds = [(EXERCISE_LABELS[i], round(float(proba[i]), 3)) for i in top_indices]
            print(f"[CLASSIFIER] Top 3: {top_preds}")
            print(f"[CLASSIFIER] Mean angles: knee_L={features[0]:.1f} knee_R={features[4]:.1f} hip_L={features[8]:.1f} hip_R={features[12]:.1f} elbow_L={features[16]:.1f} elbow_R={features[20]:.1f} spine={features[24]:.1f}")
            print(f"[CLASSIFIER] Std devs: knee_L={features[1]:.1f} knee_R={features[5]:.1f} hip_L={features[9]:.1f} hip_R={features[13]:.1f} elbow_L={features[17]:.1f} elbow_R={features[21]:.1f} spine={features[25]:.1f}")
            print(f"[CLASSIFIER] Asymmetry: knee={features[28]:.1f} hip={features[29]:.1f} elbow={features[30]:.1f}")
            if max_conf < self.confidence_threshold:
                logger.info("Low confidence %.2f for exercise classification — returning 'unknown'", max_conf)
                return "unknown"

            predicted = EXERCISE_LABELS[max_idx]
            logger.info("Classified exercise as '%s' with confidence %.2f", predicted, max_conf)
            return predicted
        except Exception as e:
            logger.warning("Exercise classification failed: %s", e)
            return "unknown"
