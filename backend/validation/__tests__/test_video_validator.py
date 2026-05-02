"""Unit tests for VideoValidator.

Requirements: 6.1, 6.2, 6.3
"""

import pytest

from backend.validation.video_validator import VideoValidationError, VideoValidator


@pytest.fixture
def validator() -> VideoValidator:
    """Return a fresh VideoValidator instance."""
    return VideoValidator()


class TestVideoValidationError:
    """Tests for the VideoValidationError exception class."""

    def test_is_exception(self):
        err = VideoValidationError("test")
        assert isinstance(err, Exception)

    def test_stores_message(self):
        err = VideoValidationError("bad format")
        assert err.message == "bad format"
        assert str(err) == "bad format"


class TestSupportedMimeTypes:
    """Tests for MIME type validation (Requirement 6.1)."""

    @pytest.mark.parametrize("mime", ["video/mp4", "video/webm", "video/quicktime"])
    def test_accepts_supported_mime_types(self, validator: VideoValidator, mime: str):
        # Should not raise for supported types with a small file
        validator.validate(b"\x00" * 100, mime)

    @pytest.mark.parametrize("mime", [
        "image/png",
        "application/pdf",
        "text/plain",
        "video/avi",
        "",
    ])
    def test_rejects_unsupported_mime_types(self, validator: VideoValidator, mime: str):
        with pytest.raises(VideoValidationError) as exc_info:
            validator.validate(b"\x00" * 100, mime)
        assert "Unsupported video format" in exc_info.value.message


class TestFileSizeValidation:
    """Tests for file size validation (Requirement 6.2)."""

    def test_accepts_file_at_max_size(self, validator: VideoValidator):
        # Exactly at the limit should pass
        data = b"\x00" * validator.MAX_FILE_SIZE_BYTES
        validator.validate(data, "video/mp4")

    def test_rejects_file_exceeding_max_size(self, validator: VideoValidator):
        data = b"\x00" * (validator.MAX_FILE_SIZE_BYTES + 1)
        with pytest.raises(VideoValidationError) as exc_info:
            validator.validate(data, "video/mp4")
        assert "exceeds the maximum" in exc_info.value.message

    def test_accepts_empty_file(self, validator: VideoValidator):
        # Zero-byte file passes size check (format is valid)
        validator.validate(b"", "video/mp4")


class TestValidationOrder:
    """MIME type is checked before file size (Requirement 6.3)."""

    def test_rejects_unsupported_mime_before_checking_size(self, validator: VideoValidator):
        # Oversized AND wrong MIME — should get the MIME error
        data = b"\x00" * (validator.MAX_FILE_SIZE_BYTES + 1)
        with pytest.raises(VideoValidationError) as exc_info:
            validator.validate(data, "application/octet-stream")
        assert "Unsupported video format" in exc_info.value.message


class TestMaxFileSizeFromConfig:
    """MAX_FILE_SIZE_BYTES is derived from config.MAX_VIDEO_SIZE_MB."""

    def test_default_max_size_is_100mb(self):
        validator = VideoValidator()
        assert validator.MAX_FILE_SIZE_BYTES == 100 * 1024 * 1024
