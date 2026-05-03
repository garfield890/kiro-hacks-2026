"""Train the exercise classifier on synthetic feature data.

Generates 31-dimensional feature vectors (28 angle stats + 3 asymmetry)
based on exercise profiles, then trains a Gradient Boosting classifier.

Run: python -m backend.analyzer.train_classifier
"""

from __future__ import annotations

import os
import pickle
import random

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from backend.analyzer.exercise_profiles import EXERCISE_PROFILES, EXERCISE_LABELS
from backend.analyzer.exercise_classifier import MODEL_PATH

SAMPLES_PER_EXERCISE = 400
JOINT_NAMES = [
    "left_knee", "right_knee", "left_hip", "right_hip",
    "left_elbow", "right_elbow", "spine_alignment",
]

# Exercises with high left-right asymmetry
ASYMMETRIC_EXERCISES = set()


def _generate_feature_vector(exercise: str) -> np.ndarray:
    """Generate a synthetic 31-feature vector for an exercise."""
    profile = EXERCISE_PROFILES[exercise]
    features = []
    joint_means = {}

    for joint in JOINT_NAMES:
        lo, hi = profile[joint]
        range_size = hi - lo

        mean_angle = random.gauss((lo + hi) / 2, range_size / 4)
        std_dev = random.gauss(range_size / 6, range_size / 12)
        std_dev = max(0.5, abs(std_dev))
        min_angle = mean_angle - std_dev * random.uniform(1.0, 2.5)
        max_angle = mean_angle + std_dev * random.uniform(1.0, 2.5)

        mean_angle += random.gauss(0, 3)
        std_dev += random.gauss(0, 1)
        std_dev = max(0.1, std_dev)

        features.extend([mean_angle, std_dev, min_angle, max_angle])
        joint_means[joint] = mean_angle

    # Asymmetry features: mean |left - right| for knee, hip, elbow
    pairs = [
        ("left_knee", "right_knee"),
        ("left_hip", "right_hip"),
        ("left_elbow", "right_elbow"),
    ]
    for left, right in pairs:
        if exercise in ASYMMETRIC_EXERCISES:
            # Lunges have high asymmetry (one leg forward, one back)
            asym = abs(random.gauss(25, 10))
        else:
            # Most exercises are roughly symmetric
            asym = abs(random.gauss(3, 2))
        features.append(asym)

    return np.array(features, dtype=np.float32)


def main():
    print(f"Generating synthetic features for {len(EXERCISE_LABELS)} exercises...")

    X_all = []
    y_all = []

    for label_idx, exercise in enumerate(EXERCISE_LABELS):
        print(f"  Generating {SAMPLES_PER_EXERCISE} samples for '{exercise}'...")
        for _ in range(SAMPLES_PER_EXERCISE):
            features = _generate_feature_vector(exercise)
            X_all.append(features)
            y_all.append(label_idx)

    X = np.array(X_all)
    y = np.array(y_all)
    print(f"Total samples: {len(X)}, features per sample: {X.shape[1]}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("Training Gradient Boosting classifier...")
    model = GradientBoostingClassifier(
        n_estimators=80,
        max_depth=5,
        learning_rate=0.12,
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=EXERCISE_LABELS))

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    print(f"\nModel saved to {MODEL_PATH}")
    print(f"Model file size: {os.path.getsize(MODEL_PATH) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
