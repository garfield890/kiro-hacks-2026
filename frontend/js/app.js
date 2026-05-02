/**
 * Top-level application state machine for Gym Form Checker.
 *
 * States: IDLE → CAMERA_ACTIVE → COUNTDOWN → RECORDING → ANALYZING → FEEDBACK / ERROR
 *
 * Wires CameraManager, Recorder, uploadVideo, and renderFeedback together.
 * Manages button visibility and handles all error/retry transitions.
 */

/** @enum {string} */
const AppState = {
  IDLE: "IDLE",
  CAMERA_ACTIVE: "CAMERA_ACTIVE",
  COUNTDOWN: "COUNTDOWN",
  RECORDING: "RECORDING",
  ANALYZING: "ANALYZING",
  FEEDBACK: "FEEDBACK",
  ERROR: "ERROR",
};

const MIN_CLIP_DURATION_SEC = 3;
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Main application controller.
 * Orchestrates camera, recording, upload, and feedback display.
 */
class App {
  constructor() {
    /** @type {string} */
    this.state = AppState.IDLE;

    // DOM elements
    this.videoEl = document.getElementById("video-preview");
    this.countdownOverlay = document.getElementById("countdown-overlay");
    this.countdownNumber = document.getElementById("countdown-number");
    this.recordingIndicator = document.getElementById("recording-indicator");
    this.recElapsed = document.getElementById("rec-elapsed");
    this.errorSection = document.getElementById("error-section");
    this.errorMessage = document.getElementById("error-message");
    this.loadingSection = document.getElementById("loading-section");
    this.feedbackSection = document.getElementById("feedback-section");

    // Buttons
    this.btnOpenCamera = document.getElementById("btn-open-camera");
    this.btnCloseCamera = document.getElementById("btn-close-camera");
    this.btnStartRecording = document.getElementById("btn-start-recording");
    this.btnCancelCountdown = document.getElementById("btn-cancel-countdown");
    this.btnStopRecording = document.getElementById("btn-stop-recording");
    this.btnRecordAgain = document.getElementById("btn-record-again");
    this.btnRetryAnalysis = document.getElementById("btn-retry-analysis");

    // Components
    this.camera = new CameraManager(this.videoEl);
    /** @type {Recorder|null} */
    this.recorder = null;
    /** @type {Blob|null} */
    this.lastBlob = null;
    /** @type {string} */
    this.lastMimeType = "";

    // Recording timer state
    /** @type {number|null} */
    this._recTimerInterval = null;
    /** @type {number} */
    this._recStartTime = 0;

    this._bindEvents();
    this._applyState();
  }

  /**
   * Binds click handlers to all control buttons.
   * @private
   */
  _bindEvents() {
    this.btnOpenCamera.addEventListener("click", () => this._openCamera());
    this.btnCloseCamera.addEventListener("click", () => this._closeCamera());
    this.btnStartRecording.addEventListener("click", () => this._startRecording());
    this.btnCancelCountdown.addEventListener("click", () => this._cancelCountdown());
    this.btnStopRecording.addEventListener("click", () => this._stopRecording());
    this.btnRecordAgain.addEventListener("click", () => this._recordAgain());
    this.btnRetryAnalysis.addEventListener("click", () => this._retryAnalysis());
  }

  /**
   * Transitions to a new state and updates the UI.
   * @param {string} newState - One of AppState values.
   * @private
   */
  _setState(newState) {
    this.state = newState;
    this._applyState();
  }

  /**
   * Updates button visibility, overlays, and sections based on current state.
   * @private
   */
  _applyState() {
    const s = this.state;

    // Buttons
    this._toggle(this.btnOpenCamera, s === AppState.IDLE);
    this._toggle(this.btnCloseCamera, s === AppState.CAMERA_ACTIVE);
    this._toggle(this.btnStartRecording, s === AppState.CAMERA_ACTIVE);
    this._toggle(this.btnCancelCountdown, s === AppState.COUNTDOWN);
    this._toggle(this.btnStopRecording, s === AppState.RECORDING);
    this._toggle(this.btnRecordAgain, s === AppState.FEEDBACK || s === AppState.ERROR);
    this._toggle(this.btnRetryAnalysis, s === AppState.ERROR);

    // Overlays
    this._toggle(this.countdownOverlay, s === AppState.COUNTDOWN);
    this._toggle(this.recordingIndicator, s === AppState.RECORDING);
    this._toggle(this.loadingSection, s === AppState.ANALYZING);

    // Error section stays visible in ERROR state
    if (s !== AppState.ERROR) {
      this._toggle(this.errorSection, false);
    }

    // Feedback section stays visible in FEEDBACK state
    if (s !== AppState.FEEDBACK) {
      this._toggle(this.feedbackSection, false);
    }
  }

  /**
   * Shows or hides an element via the "hidden" class.
   * @param {HTMLElement} el
   * @param {boolean} visible
   * @private
   */
  _toggle(el, visible) {
    if (visible) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  }

  /**
   * Displays an error message and transitions to ERROR state.
   * @param {string} msg
   * @private
   */
  _showError(msg) {
    this.errorMessage.textContent = msg;
    this._toggle(this.errorSection, true);
    this._setState(AppState.ERROR);
  }

  // ── Camera ──────────────────────────────────────────────

  /** @private */
  async _openCamera() {
    try {
      await this.camera.open();
      this._setState(AppState.CAMERA_ACTIVE);
    } catch (err) {
      this._showError(err.message);
    }
  }

  /** @private */
  _closeCamera() {
    this.camera.close();
    this._setState(AppState.IDLE);
  }

  // ── Countdown / Recording ──────────────────────────────

  /** @private */
  _startRecording() {
    const stream = this.camera.getStream();
    if (!stream) {
      this._showError("Camera stream is not available. Please open the camera first.");
      return;
    }

    this.recorder = new Recorder(stream);
    this._setState(AppState.COUNTDOWN);

    this.recorder.startCountdown(
      (remaining) => {
        this.countdownNumber.textContent = remaining;
      },
      () => this._onCountdownComplete(),
      () => this._onCountdownCancelled()
    );
  }

  /** @private */
  _cancelCountdown() {
    if (this.recorder) {
      this.recorder.cancelCountdown();
    }
  }

  /**
   * Called when the countdown reaches zero — begins actual recording.
   * @private
   */
  _onCountdownComplete() {
    this._setState(AppState.RECORDING);
    this._startRecTimer();

    this.recorder.startRecording(() => this._onRecordingStopped());
  }

  /**
   * Called when the user cancels the countdown.
   * @private
   */
  _onCountdownCancelled() {
    this.recorder = null;
    this._setState(AppState.CAMERA_ACTIVE);
  }

  /** @private */
  _stopRecording() {
    if (this.recorder) {
      this.recorder.stopRecording();
    }
  }

  /**
   * Called when recording stops (manual or auto-stop).
   * Validates the clip and starts upload.
   * @private
   */
  _onRecordingStopped() {
    this._stopRecTimer();

    const blob = this.recorder.getBlob();
    const mimeType = this.recorder.getMimeType();

    if (!blob) {
      this._showError("Recording failed — no video data was captured.");
      return;
    }

    // Client-side validation: minimum duration
    const elapsedSec = (Date.now() - this._recStartTime) / 1000;
    if (elapsedSec < MIN_CLIP_DURATION_SEC) {
      this._showError(
        "Recording is too short. Please record for at least 3 seconds."
      );
      return;
    }

    // Client-side validation: max file size
    if (blob.size > MAX_FILE_SIZE_BYTES) {
      this._showError(
        "Recording is too large (over 100 MB). Please record a shorter clip."
      );
      return;
    }

    this.lastBlob = blob;
    this.lastMimeType = mimeType;
    this._submitForAnalysis();
  }

  // ── Recording timer ────────────────────────────────────

  /**
   * Starts the elapsed-time display for the recording indicator.
   * @private
   */
  _startRecTimer() {
    this._recStartTime = Date.now();
    this.recElapsed.textContent = "00:00";

    this._recTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this._recStartTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const secs = String(elapsed % 60).padStart(2, "0");
      this.recElapsed.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  /**
   * Stops the elapsed-time display.
   * @private
   */
  _stopRecTimer() {
    if (this._recTimerInterval !== null) {
      clearInterval(this._recTimerInterval);
      this._recTimerInterval = null;
    }
  }

  // ── Upload / Analysis ──────────────────────────────────

  /**
   * Submits the last recorded blob for backend analysis.
   * @private
   */
  async _submitForAnalysis() {
    this._setState(AppState.ANALYZING);
    clearFeedback();

    try {
      const report = await uploadVideo(this.lastBlob, this.lastMimeType);
      renderFeedback(report);
      this._setState(AppState.FEEDBACK);
    } catch (err) {
      this._showError(err.message);
    }
  }

  // ── Retry / Record Again ───────────────────────────────

  /**
   * Returns to camera preview for a new recording session.
   * @private
   */
  _recordAgain() {
    this.lastBlob = null;
    this.lastMimeType = "";
    this.recorder = null;
    clearFeedback();
    this._setState(AppState.CAMERA_ACTIVE);
  }

  /**
   * Re-submits the same blob for analysis without re-recording.
   * @private
   */
  _retryAnalysis() {
    if (!this.lastBlob) {
      this._showError("No recording available to retry. Please record again.");
      return;
    }
    this._submitForAnalysis();
  }
}

// ── Bootstrap ──────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  new App();
});
