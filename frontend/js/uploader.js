/**
 * Uploads a recorded video Blob to the backend analysis endpoint.
 *
 * Builds a multipart/form-data request with the video clip and sends
 * it to `/api/analyze`. Returns the parsed FeedbackReport on success,
 * or throws a descriptive error on HTTP or network failures.
 *
 * @param {Blob} blob - The recorded video Blob.
 * @param {string} [mimeType="video/webm"] - The MIME type of the recording.
 * @returns {Promise<FeedbackReport>} The analysis feedback report.
 * @throws {Error} On network failure or non-OK HTTP response.
 */
async function uploadVideo(blob, mimeType = "video/webm") {
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  const formData = new FormData();
  formData.append("video_clip", blob, `recording.${ext}`);

  let response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    throw new Error(`Network error: unable to reach the server. ${err.message}`);
  }

  if (!response.ok) {
    let detail = `Server returned ${response.status}`;
    try {
      const body = await response.json();
      if (body.detail) {
        detail = body.detail;
      }
    } catch {
      // ignore JSON parse failures on error responses
    }

    if (response.status === 405) {
      detail =
        "405 Method Not Allowed — the /api/analyze endpoint rejected the request. " +
        "This usually means the API route is not registered or the static file server " +
        "is intercepting the request. Make sure the backend is running and the API " +
        "router is mounted before the static file mount.";
    }

    throw new Error(detail);
  }

  const report = await response.json();
  return report;
}
