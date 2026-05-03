# Agent Hooks

## Details

### What specific workflows did you automate with Kiro hooks?
One hook that we created was for Kiro to automatically run ESLint every time a JS or JSX file was saved. This allowed us to automatically check code quality and types without having to manually run ESLint or manually ask Kiro to run it every time. Another hook that we created was for Kiro to remind me to retrain the machine learning model everytime the exercises were changed or the training data was changed. This made it so we never accidentally used an old model and were always using the most up to date model. Another one that we created was for Kiro to automatically verify the backend everytime a tasks completes. We did this because we would run into import errors in our backend since the task used a dependency that was not installed on our computer. We used more hooks, but these are the main and most helpful ones.

### How did these hooks improve your development process?
These hooks made it so that we didn't have to repeatedly manually call certain checkers and linters. It also reduced the chance that we forgot about something because Kiro would automatically remind us to fix a dependency if something else changed. Overall, they made us more efficient and effective while working on the project.