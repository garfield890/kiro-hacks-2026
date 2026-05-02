"""Video validation for uploaded clips.

This module provides the VideoValidator class that checks uploaded video files
for supported MIME types and file size limits before any processing occurs.

Requirements: 6.1, 6.2, 6.3
"""

from __future__ import annotations

from backend.config import MAX_VIDEO_SIZE_MB


class VideoValidationError(Exception):
    """Raised when an uploaded video fails format or size validation.

    Attributes:
        message: Human-readable description of the validation failure.
    """

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class VideoValidator:
    """Validates an uploaded video file before analysis.

    Checks that the file's MIME type is in the set of supported formats and
    that the file size does not exceed the configured maximum.

    Attributes:
        SUPPORTED_MIME_TYPES: The set of accepted video MIME types.
        MAX_FILE_SIZE_BYTES: Maximum allowed file size in bytes, derived from
            the ``MAX_VIDEO_SIZE_MB`` configuration value.
    """

    SUPPORTED_MIME_TYPES: frozenset[str] = frozenset({
        "video/mp4",
        "video/webm",
        "video/quicktime",
    })

    MAX_FILE_SIZE_BYTES: int = MAX_VIDEO_SIZE_MB * 1024 * 1024

    def validate(self, file_bytes: bytes, content_type: str) -> None:
        """Validate a video file's MIME type and size.

        Args:
            file_bytes: The raw bytes of the uploaded video file.
            content_type: The MIME type reported by the client.

        Raises:
            VideoValidationError: If the MIME type is not supported or the
                file exceeds the maximum allowed size.
        """
        if content_type not in self.SUPPORTED_MIME_TYPES:
            raise VideoValidationError(
                f"Unsupported video format: {content_type}. "
                f"Supported formats are: {', '.join(sorted(self.SUPPORTED_MIME_TYPES))}."
            )

        if len(file_bytes) > self.MAX_FILE_SIZE_BYTES:
            size_mb = len(file_bytes) / (1024 * 1024)
            max_mb = self.MAX_FILE_SIZE_BYTES / (1024 * 1024)
            raise VideoValidationError(
                f"File size ({size_mb:.1f} MB) exceeds the maximum allowed "
                f"size of {max_mb:.0f} MB."
            )
