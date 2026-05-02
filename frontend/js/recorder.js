/**
 * Wraps MediaRecorder with countdown logic and auto-stop.
 *
 * Provides a 10-second countdown before recording, collects video
 * chunks into a Blob, and auto-stops after a maximum duration.
 */
class Recorder {
  /**
   * @param {MediaStream} stream - The active camera stream to record.
   * @param {object} [options]
   * @param {number} [options.countdownSeconds=10] - Seconds to count down before recording.
   * @param {number} [options.maxDurationSeconds=120] - Maximum recording duration in seconds.
   */
  constructor(stream, options = {}) {
    /** @type {MediaStream} */
    this.stream = stream;

    /** @type {number} */
    this.countdownSeconds = options.countdownSeconds ?? 10;

    /** @type {number} */
    this.maxDurationSeconds = options.maxDurationSeconds ?? 120;

    /** @type {number|null} */
    this._countdownInterval = null;

    /** @type {MediaRecorder|null} */
    this._mediaRecorder = null;

    /** @type {Blob[]} */
    this._chunks = [];

    /** @type {Blob|null} */
    this._blob = null;

    /** @type {string} */
    this._mimeType = "";

    /** @type {number|null} */
    this._autoStopTimeout = null;

    /** @type {Function|null} */
    this._onCancelCb = null;
  }

  /**
   * Starts a countdown that fires onTick each second with the remaining
   * value, then calls onComplete when it reaches zero.
   *
   * @param {function(number): void} onTick - Called each second with remaining seconds (N, N-1, …, 1).
   * @param {function(): void} onComplete - Called when countdown reaches zero.
   * @param {function(): void} [onCancel] - Called if the countdown is cancelled.
   */
  startCountdown(onTick, onComplete, onCancel) {
    this._onCancelCb = onCancel || null;
    let remaining = this.countdownSeconds;

    // Fire the first tick immediately
    onTick(remaining);
    remaining--;

    this._countdownInterval = setInterval(() => {
      if (remaining > 0) {
        onTick(remaining);
        remaining--;
      } else {
        clearInterval(this._countdownInterval);
        this._countdownInterval = null;
        onComplete();
      }
    }, 1000);
  }

  /**
   * Cancels an active countdown and invokes the onCancel callback.
   */
  cancelCountdown() {
    if (this._countdownInterval !== null) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
    if (this._onCancelCb) {
      this._onCancelCb();
      this._onCancelCb = null;
    }
  }

  /**
   * Starts recording from the stream using the best supported MIME type.
   *
   * @param {function(): void} [onStop] - Called when recording stops (manual or auto).
   */
  startRecording(onStop) {
    this._chunks = [];
    this._blob = null;
    this._mimeType = this._selectMimeType();

    const options = this._mimeType ? { mimeType: this._mimeType } : {};
    this._mediaRecorder = new MediaRecorder(this.stream, options);

    this._mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this._chunks.push(event.data);
      }
    };

    this._mediaRecorder.onstop = () => {
      this._clearAutoStop();
      this._blob = new Blob(this._chunks, { type: this._mimeType });
      if (onStop) {
        onStop();
      }
    };

    this._mediaRecorder.start(1000); // collect chunks every second

    // Auto-stop after max duration
    this._autoStopTimeout = setTimeout(() => {
      this.stopRecording();
    }, this.maxDurationSeconds * 1000);
  }

  /**
   * Stops the active recording and assembles the Blob.
   */
  stopRecording() {
    this._clearAutoStop();
    if (this._mediaRecorder && this._mediaRecorder.state !== "inactive") {
      this._mediaRecorder.stop();
    }
  }

  /**
   * Returns the recorded Blob, or null if no recording has completed.
   *
   * @returns {Blob|null}
   */
  getBlob() {
    return this._blob;
  }

  /**
   * Returns the MIME type used for the recording.
   *
   * @returns {string}
   */
  getMimeType() {
    return this._mimeType;
  }

  /**
   * Selects the best supported MIME type for MediaRecorder.
   * Preference order: video/mp4 → video/webm;codecs=vp9 → video/webm
   *
   * @returns {string} The first supported MIME type, or empty string as fallback.
   * @private
   */
  _selectMimeType() {
    const candidates = [
      "video/mp4",
      "video/webm;codecs=vp9",
      "video/webm",
    ];
    for (const type of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  }

  /**
   * Clears the auto-stop timeout if active.
   *
   * @private
   */
  _clearAutoStop() {
    if (this._autoStopTimeout !== null) {
      clearTimeout(this._autoStopTimeout);
      this._autoStopTimeout = null;
    }
  }
}
