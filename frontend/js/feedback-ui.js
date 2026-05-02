/**
 * Renders a FeedbackReport into the #feedback-section element.
 *
 * Creates clearly labeled sections for the Form Score, positive
 * observations, and improvement suggestions.
 *
 * @param {FeedbackReport} report - The analysis feedback report.
 */
function renderFeedback(report) {
  const section = document.getElementById("feedback-section");
  section.innerHTML = "";
  section.classList.remove("hidden");

  // Form Score
  const scoreDisplay = document.createElement("div");
  scoreDisplay.className = "score-display";

  const scoreValue = document.createElement("div");
  scoreValue.className = "score-value";
  scoreValue.id = "form-score-value";
  scoreValue.textContent = report.form_score;
  scoreDisplay.appendChild(scoreValue);

  const scoreLabel = document.createElement("div");
  scoreLabel.className = "score-label";
  scoreLabel.textContent = "Form Score";
  scoreDisplay.appendChild(scoreLabel);

  section.appendChild(scoreDisplay);

  // Positive Observations
  const posGroup = document.createElement("div");
  posGroup.className = "feedback-group positive";

  const posHeading = document.createElement("h3");
  posHeading.textContent = "What You Did Well";
  posGroup.appendChild(posHeading);

  const posList = document.createElement("ul");
  posList.id = "positive-observations-list";
  for (const item of report.positive_observations) {
    const li = document.createElement("li");
    li.textContent = item;
    posList.appendChild(li);
  }
  posGroup.appendChild(posList);
  section.appendChild(posGroup);

  // Improvement Suggestions
  const impGroup = document.createElement("div");
  impGroup.className = "feedback-group improvements";

  const impHeading = document.createElement("h3");
  impHeading.textContent = "Areas to Improve";
  impGroup.appendChild(impHeading);

  const impList = document.createElement("ul");
  impList.id = "improvement-suggestions-list";
  for (const item of report.improvement_suggestions) {
    const li = document.createElement("li");
    li.textContent = item;
    impList.appendChild(li);
  }
  impGroup.appendChild(impList);
  section.appendChild(impGroup);
}

/**
 * Clears the feedback section and hides it.
 */
function clearFeedback() {
  const section = document.getElementById("feedback-section");
  section.innerHTML = "";
  section.classList.add("hidden");
}
