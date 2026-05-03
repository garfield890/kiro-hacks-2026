"""Pose analysis engine using MediaPipe PoseLandmarker (tasks API).

This module provides the PoseAnalyzer class which extracts per-frame pose
landmarks from a video file.  It uses OpenCV for frame-by-frame decoding
and MediaPipe's PoseLandmarker task for 33-landmark body-pose estimation.

Requirements: 4.1, 4.3
"""

from __future__ import annotations

import logging
import os
from typing import List

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    PoseLandmarker,
    PoseLandmarkerOptions,
    RunningMode,
)

from backend.models.feedback import FrameLandmarks

logger = logging.getLogger(__name__)

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker_lite.task")


class PoseAnalyzer:
    """Extracts per-frame pose landmarks from a video file using MediaPipe PoseLandmarker.

    Frames where no pose is detected are silently skipped — only frames with
    a successful detection appear in the returned list.
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

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        results: List[FrameLandmarks] = []

        options = PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=_MODEL_PATH),
            running_mode=RunningMode.VIDEO,
            num_poses=1,
        )

        with PoseLandmarker.create_from_options(options) as landmarker:
            frame_index = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                # Create MediaPipe Image
                mp_image = mp.Image(
                    image_format=mp.ImageFormat.SRGB,
                    data=rgb_frame,
                )

                # Calculate timestamp in milliseconds
                timestamp_ms = int(frame_index * 1000 / fps)

                # Detect pose
                detection_result = landmarker.detect_for_video(mp_image, timestamp_ms)

                if detection_result.pose_landmarks and len(detection_result.pose_landmarks) > 0:
                    pose = detection_result.pose_landmarks[0]
                    landmarks = [
                        (lm.x, lm.y, lm.z, lm.visibility if hasattr(lm, 'visibility') else 0.9)
                        for lm in pose
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
