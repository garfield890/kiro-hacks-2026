"""Application configuration loaded from environment variables.

All runtime configuration is centralized here. Values are read from
environment variables with sensible defaults so the app can run
out-of-the-box in development while remaining configurable in production.
"""

import os


def _getIntEnv(name: str, default: int) -> int:
    """Return an environment variable as an integer, falling back to *default*.

    Args:
        name: Environment variable name.
        default: Value returned when the variable is unset or empty.

    Raises:
        ValueError: If the variable is set but cannot be parsed as an integer.
    """
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        raise ValueError(
            f"Environment variable {name} must be an integer, got: {raw!r}"
        )


def _getStrEnv(name: str, default: str) -> str:
    """Return an environment variable as a string, falling back to *default*.

    Args:
        name: Environment variable name.
        default: Value returned when the variable is unset or empty.
    """
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return default
    return value


# ---------------------------------------------------------------------------
# Public configuration values
# ---------------------------------------------------------------------------

MAX_VIDEO_SIZE_MB: int = _getIntEnv("MAX_VIDEO_SIZE_MB", 100)
"""Maximum upload size in megabytes."""

MIN_CLIP_DURATION_SEC: int = _getIntEnv("MIN_CLIP_DURATION_SEC", 3)
"""Minimum clip duration in seconds — shorter clips are rejected."""

MAX_CLIP_DURATION_SEC: int = _getIntEnv("MAX_CLIP_DURATION_SEC", 120)
"""Maximum recording duration in seconds."""

MEDIAPIPE_MODEL_COMPLEXITY: int = _getIntEnv("MEDIAPIPE_MODEL_COMPLEXITY", 1)
"""BlazePose model complexity (0 = lite, 1 = full, 2 = heavy)."""

TEMP_UPLOAD_DIR: str = _getStrEnv("TEMP_UPLOAD_DIR", "/tmp")
"""Directory used for temporary video file storage during analysis."""
