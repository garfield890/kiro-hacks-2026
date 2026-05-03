/**
 * Upload a video blob to the backend for analysis.
 * @param {Blob} blob
 * @param {string} mimeType
 * @returns {Promise<object>} FeedbackReport
 */
export async function uploadVideo(blob, mimeType = 'video/webm') {
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('quicktime') ? 'mov' : 'webm'
  const formData = new FormData()
  formData.append('video_clip', blob, `recording.${ext}`)

  let response
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    throw new Error(`Network error: unable to reach the server. ${err.message}`)
  }

  if (!response.ok) {
    let detail = `Server returned ${response.status}`
    try {
      const body = await response.json()
      if (body.detail) detail = body.detail
    } catch {
      // ignore
    }
    if (response.status === 405) {
      detail = '405 Method Not Allowed — the API endpoint is not reachable. Make sure the backend is running.'
    }
    throw new Error(detail)
  }

  return response.json()
}
