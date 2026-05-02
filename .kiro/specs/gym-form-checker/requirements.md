# Requirements Document

## Introduction

Gym Form Checker is an MVP web application that uses a device camera to record a user performing a gym exercise, then analyzes the recorded video to assess exercise form and provide actionable improvement feedback. The app targets gym-goers who want real-time, AI-assisted coaching without a personal trainer present.

The core flow is: open camera → start a recording session with a countdown → record the exercise → stop recording → receive form analysis and feedback.

## Glossary

- **App**: The Gym Form Checker web application
- **Camera_Feed**: The live video stream captured from the user's device camera via OpenCV
- **Recording_Session**: A single video capture period initiated by the user, bounded by a start and stop event
- **Countdown_Timer**: The 10-second visual countdown displayed before recording begins
- **Video_Clip**: The recorded video file produced at the end of a Recording_Session
- **Analyzer**: The backend component responsible for processing a Video_Clip and assessing exercise form
- **Feedback_Report**: The structured output produced by the Analyzer containing form assessment and improvement suggestions
- **Form_Score**: A qualitative or numeric rating of the user's exercise form included in the Feedback_Report

---

## Requirements

### Requirement 1: Camera Access

**User Story:** As a gym user, I want to open my camera from the web UI, so that I can see my live video feed before recording.

#### Acceptance Criteria

1. THE App SHALL display a "Open Camera" button on the main page when no Camera_Feed is active.
2. WHEN the user clicks the "Open Camera" button, THE App SHALL request permission to access the device camera.
3. WHEN camera permission is granted, THE App SHALL display the live Camera_Feed in a video preview element on the page.
4. IF camera permission is denied, THEN THE App SHALL display a descriptive error message explaining that camera access is required.
5. IF no camera device is detected, THEN THE App SHALL display a descriptive error message informing the user that no camera was found.
6. WHILE the Camera_Feed is active, THE App SHALL display a "Close Camera" button that stops the Camera_Feed when clicked.

---

### Requirement 2: Recording Session Initiation with Countdown

**User Story:** As a gym user, I want a countdown before recording starts, so that I have time to get into position before the camera begins capturing my exercise.

#### Acceptance Criteria

1. WHILE the Camera_Feed is active, THE App SHALL display a "Start Recording" button.
2. WHEN the user clicks the "Start Recording" button, THE App SHALL begin a 10-second Countdown_Timer displayed prominently over the Camera_Feed.
3. WHILE the Countdown_Timer is running, THE App SHALL update the displayed countdown value once per second.
4. WHILE the Countdown_Timer is running, THE App SHALL display a "Cancel" button that stops the countdown and returns the App to the camera preview state.
5. WHEN the Countdown_Timer reaches zero, THE App SHALL automatically begin a Recording_Session.

---

### Requirement 3: Video Recording

**User Story:** As a gym user, I want to record my exercise, so that the app can analyze my form.

#### Acceptance Criteria

1. WHEN a Recording_Session begins, THE App SHALL capture video frames from the Camera_Feed and store them as a Video_Clip.
2. WHILE a Recording_Session is active, THE App SHALL display a visible recording indicator (e.g., a red dot and elapsed time) on the UI.
3. WHILE a Recording_Session is active, THE App SHALL display a "Stop Recording" button.
4. WHEN the user clicks the "Stop Recording" button, THE App SHALL end the Recording_Session and finalize the Video_Clip.
5. WHEN a Recording_Session reaches 120 seconds, THE App SHALL automatically end the Recording_Session and finalize the Video_Clip.
6. IF an error occurs during video capture, THEN THE App SHALL end the Recording_Session, discard the partial Video_Clip, and display a descriptive error message.

---

### Requirement 4: Video Analysis

**User Story:** As a gym user, I want the app to analyze my recorded exercise video, so that I can receive objective feedback on my form.

#### Acceptance Criteria

1. WHEN a Video_Clip is finalized, THE App SHALL automatically submit the Video_Clip to the Analyzer.
2. WHILE the Analyzer is processing a Video_Clip, THE App SHALL display a loading indicator to the user.
3. WHEN the Analyzer completes processing, THE App SHALL display the resulting Feedback_Report to the user.
4. IF the Analyzer fails to process the Video_Clip, THEN THE App SHALL display a descriptive error message and offer the user the option to retry the analysis.
5. IF the Video_Clip duration is less than 3 seconds, THEN THE App SHALL reject the clip before submission and display a message informing the user that the recording is too short.

---

### Requirement 5: Feedback Report Display

**User Story:** As a gym user, I want to see clear feedback on my exercise form, so that I know what I did well and what I should improve.

#### Acceptance Criteria

1. THE Feedback_Report SHALL include a Form_Score representing the overall quality of the user's exercise form.
2. THE Feedback_Report SHALL include at least one positive observation about the user's form.
3. THE Feedback_Report SHALL include at least one specific, actionable improvement suggestion.
4. WHEN the Feedback_Report is displayed, THE App SHALL present the Form_Score, positive observations, and improvement suggestions in clearly labeled sections.
5. WHEN the Feedback_Report is displayed, THE App SHALL provide a "Record Again" button that returns the user to the camera preview state for a new Recording_Session.

---

### Requirement 6: Input Validation and Security

**User Story:** As a developer, I want all inputs and uploaded data to be validated and sanitized, so that the app is secure and robust.

#### Acceptance Criteria

1. WHEN a Video_Clip is submitted to the Analyzer, THE App SHALL validate that the file is a supported video format before processing.
2. WHEN a Video_Clip is submitted to the Analyzer, THE App SHALL validate that the file size does not exceed 100 MB.
3. IF a Video_Clip fails format or size validation, THEN THE App SHALL reject the submission and display a descriptive error message without processing the file.
4. THE App SHALL store all configuration values (e.g., API keys, model paths) in environment variables and SHALL NOT hardcode secrets in source files.
