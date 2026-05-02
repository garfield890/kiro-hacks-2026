"""Pose analysis engine using MediaPipe BlazePose.

This module provides the PoseAnalyzer class which extracts per-frame pose
landmarks from a video file.  It uses OpenCV for frame-by-frame decoding
and MediaPipe BlazePose for 33-landmark body-pose estimation.

Requirements: 4.1, 4.3
"""

from __future__ import annotations

import logging
from typing import List

import cv2
import mediapipe as mp

from backend.config import MEDIAPIPE_MODEL_COMPLEXITY
from backend.models.feedback import FrameLandmarks

logger = logging.getLogger(__name__)


class PoseAnalyzer:
    """Extracts per-frame pose landmarks from a video file using MediaPipe BlazePose.

    Frames where no pose is detected are silently skipped — only frames with
    a successful detection appear in the returned list.

    The BlazePose model complexity is controlled by the
    ``MEDIAPIPE_MODEL_COMPLEXITY`` configuration value (0 = lite, 1 = full,
    2 = heavy).
    """

    def analyze_video(self, video_path: str) -> List[FrameLandmarks]:
        """Open a video file and run pose estimation on every frame.

        Args:
            video_path: Filesystem path to the video file to analyse.

        Returns:
            A list of ``FrameLandmarks`` instances, one per frame where a
            pose was successfully detected.  Frames with no detection are
            omitted.

        Raises:
            RuntimeError: If the video file cannot be opened by OpenCV.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Failed to open video file: {video_path}")

        results: List[FrameLandmarks] = []

        mp_pose = mp.solutions.pose
        with mp_pose.Pose(
            static_image_mode=False,
            model_complexity=MEDIAPIPE_MODEL_COMPLEXITY,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        ) as pose:
            frame_index = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # MediaPipe expects RGB; OpenCV reads BGR.
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pose_result = pose.process(rgb_frame)

                if pose_result.pose_landmarks is not None:
                    landmarks = [
                        (lm.x, lm.y, lm.z, lm.visibility)
                        for lm in pose_result.pose_landmarks.landmark
                    ]
                    results.append(
                        FrameLandmarks(
                            frame_index=frame_index,
                            landmarks=landmarks,
                        )
                    )
                else:
                    logger.debug(
                        "No pose detected in frame %d — skipping", frame_index
                    )

                frame_index += 1

        cap.release()

        logger.info(
            "Analyzed %d frames, detected pose in %d",
            frame_index,
            len(results),
        )
        return results
