# RelayReel Agent Guidelines

## General Principles
- **Use established libraries** listed in `Project Specification` whenever possible; avoid reinventing common solutions.
- **Keep UI and app logic separate**:
  - Components in `src/components/` must be presentational only.
  - Hooks in `src/features/` handle state and side effects.
  - External API interactions reside in `src/services/`.

## Workflow
1. **Consult library docs** before adding or updating features to ensure correct usage.
2. Maintain a *big-picture view*: consider how changes affect other modules and the overall architecture.
3. Run lint, type-check, unit tests, and any Playwright tests before committing.
4. Do **not** add binary assets (images, videos, etc.) to the repository.
5. Follow TypeScript, ESLint, and Prettier configurations; keep code and commit messages concise and descriptive.
6. Include relevant documentation updates and references to `Project Specification` in pull requests.

## Testing Commands
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e` (Playwright, if applicable)

Ensure all checks pass before submitting PRs.
