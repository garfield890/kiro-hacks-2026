# Project Steering

## Overview
This project follows standard conventions for maintainability and consistency.

## Code Style
- Use 2-space indentation for JavaScript/TypeScript files
- Use 4-space indentation for Python files
- Always include JSDoc/docstring comments for public functions and classes
- Prefer `const` over `let` where possible; avoid `var`

## Naming Conventions
- Files: `kebab-case` (e.g., `user-service.ts`)
- Classes: `PascalCase` (e.g., `UserService`)
- Functions and variables: `camelCase` (e.g., `getUserById`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)

## Git Workflow
- Branch naming: `feature/<ticket-id>-short-description`, `fix/<ticket-id>-short-description`
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- Always open a PR for review; never push directly to `main`

## Testing
- Unit tests live alongside source files in `__tests__` directories
- Integration tests live in `tests/integration`
- Aim for >80% coverage on business logic
- Run `npm test` (or equivalent) before committing

## Security
- Never commit secrets, API keys, or credentials — use environment variables
- Validate and sanitize all user inputs
- Use parameterized queries for any database access
