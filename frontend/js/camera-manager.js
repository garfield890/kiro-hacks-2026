/**
 * Manages camera stream lifecycle.
 *
 * Opens the device camera via getUserMedia, attaches the stream to a
 * video element for live preview, and provides methods to close the
 * stream and retrieve the active MediaStream.
 */
class CameraManager {
  /**
   * @param {HTMLVideoElement} videoEl - The video element used for live preview.
   */
  constructor(videoEl) {
    /** @type {HTMLVideoElement} */
    this.videoEl = videoEl;

    /** @type {MediaStream|null} */
    this.stream = null;
  }

  /**
   * Opens the device camera and attaches the stream to the video element.
   *
   * @returns {Promise<void>}
   * @throws {Error} Descriptive error when permission is denied or no device is found.
   */
  async open() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.stream = stream;
      this.videoEl.srcObject = stream;
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error(
          "Camera access is required. Please allow camera permission and try again."
        );
      }
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        throw new Error("No camera was found on this device.");
      }
      throw new Error(`Camera error: ${err.message}`);
    }
  }

  /**
   * Stops all tracks on the active stream and clears the video element.
   */
  close() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.videoEl.srcObject = null;
  }

  /**
   * Returns the active MediaStream, or null if the camera is not open.
   *
   * @returns {MediaStream|null}
   */
  getStream() {
    return this.stream;
  }
}
