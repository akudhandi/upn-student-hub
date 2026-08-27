# AGENTS.md

## Project

UPN Student Hub is a solo-developer student platform consisting of:

- `backend-api/` — Laravel 11 API
- `student-web/` — Next.js 16 student application
- `admin-web/` — Next.js 16 admin application
- Docker Compose — local infrastructure

## Source of Truth

- `SYSTEM_ANALYSIS.md` is the authoritative architecture and scope document.
- Do not contradict or silently reinterpret it.
- If requirements conflict with `SYSTEM_ANALYSIS.md`, stop and ask for clarification.

## Architecture Guardrails

- Do not change architecture without explicit approval.
- Do not implement Post-MVP features unless explicitly requested.
- Keep solutions appropriate for a solo developer.
- Prefer the simplest solution that satisfies the requirement.
- Do not introduce unnecessary infrastructure, services, frameworks, libraries, or dependencies.
- MVP storage is local disk.
- Maps use Leaflet.js + OpenStreetMap.
- Chat is 1-on-1 only.
- Do not introduce Python microservices, Google Maps, S3/MinIO, Group Chat, SSO, or other Post-MVP architecture without approval.

## Scope Discipline

Before implementation:

1. Inspect the existing implementation.
2. Read the relevant section of `SYSTEM_ANALYSIS.md`.
3. Identify the exact requested scope.
4. State the planned change briefly.
5. Implement only that scope.

After implementation:

1. Run appropriate verification.
2. Report what changed and any remaining issues.
3. Stop at the requested task or phase.

Do not continue automatically into the next task.

## Skills

Use the repository's Agent Skills when applicable.

- Use `context-engineering` when determining what project context is necessary.
- Use `incremental-implementation` for feature implementation.
- Use `frontend-ui-engineering` for UI/frontend work.
- Use `code-review-and-quality` before approving completed changes.
- Use `git-workflow-and-versioning` for commits and checkpoints.
- Use other available skills only when they directly apply to the current task.

Do not load unrelated skills or unnecessary project context.

## Backend Rules

- Follow Laravel 11 conventions.
- Keep API routes under `/api/v1/`.
- Use Eloquent relationships instead of unnecessary custom data access patterns.
- Use polymorphic relations where specified by `SYSTEM_ANALYSIS.md`.
- Validate external input.
- Do not add business logic outside the appropriate application layer.
- Do not create abstractions without a concrete current use case.

## Frontend Rules

- Use the existing Next.js architecture and components before creating new patterns.
- Prefer reusable components when repetition is real.
- Keep client-side JavaScript minimal.
- Follow accessibility and responsive design principles.
- Do not introduce a UI library without approval.

## UI/UX Guardrails

Build for usability, not visual novelty.

Avoid generic AI-generated aesthetics, including:

- excessive gradients;
- excessive glassmorphism;
- excessive rounded cards;
- excessive shadows;
- glowing effects;
- unnecessary animations;
- decorative elements without functional purpose;
- repetitive dashboard/card layouts when another layout communicates better.

Prefer:

- clear visual hierarchy;
- readable typography;
- purposeful spacing;
- consistent design tokens;
- accessible contrast;
- responsive layouts;
- meaningful interaction states.

Reuse existing design patterns once established.

Do not redesign an existing interface unless the task explicitly requests a redesign.

## Verification

Never claim a task is complete without appropriate verification.

Prefer the smallest relevant verification:

- PHP syntax/lint for PHP-only changes.
- Laravel tests for backend behavior.
- TypeScript/ESLint/build checks for frontend changes.
- Database migration status for migration work.
- Browser/runtime verification for UI behavior when applicable.

Do not run destructive commands unless explicitly requested or clearly required.

## Git

Treat commits as checkpoints.

- Keep commits focused and atomic.
- Do not commit unrelated changes.
- Never use destructive Git commands to hide or discard user work.
- Before committing, inspect `git status` and the relevant diff.
- Do not modify unrelated files merely to make the working tree clean.

## Communication

Keep reports concise.

For implementation tasks, report:

1. What changed.
2. Verification performed.
3. Any remaining issue.

If blocked by ambiguity, stop and ask rather than guessing.