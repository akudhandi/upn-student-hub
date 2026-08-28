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
- Do not invent requirements that are not supported by the project documentation or current task.

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

1. Run the smallest relevant verification.
2. Report what changed and any remaining issues.
3. Stop at the requested task or phase.

Do not continue automatically into the next task.

## Context & Skills

Use repository Agent Skills only when they directly apply to the current task.

Preferred skills:

- `context-engineering` — determine the minimum project context required.
- `incremental-implementation` — implement features incrementally.
- `frontend-ui-engineering` — frontend and UI work.
- `code-review-and-quality` — review completed implementation when requested or appropriate.
- `git-workflow-and-versioning` — commits and checkpoints.

Rules:

- Do not load unrelated skills.
- Do not load the same skill repeatedly if its guidance is already available in the current task context.
- Do not inspect unrelated files merely for completeness.
- Prefer targeted file inspection over reading the entire repository.
- Keep implementation and verification proportional to the requested change.

## Backend Rules

- Follow Laravel 11 conventions.
- Keep API routes under `/api/v1/`.
- Use Eloquent relationships instead of unnecessary custom data access patterns.
- Use polymorphic relations where specified by `SYSTEM_ANALYSIS.md`.
- Validate external input.
- Do not add business logic outside the appropriate application layer.
- Do not create abstractions without a concrete current use case.
- Follow existing backend patterns before introducing new ones.

## Frontend Rules

- Use the existing Next.js architecture and components before creating new patterns.
- Inspect existing pages, layouts, components, `globals.css`, and `package.json` before creating new UI patterns.
- Prefer reusable components when repetition is real.
- Do not create duplicate components or styling systems.
- Keep client-side JavaScript minimal.
- Follow accessibility and responsive design principles.
- Use Tailwind CSS and existing project conventions.
- Do not introduce a UI library without approval.
- Do not modify backend architecture for a frontend-only requirement unless explicitly necessary.

## UI/UX Guardrails

Build for usability, clarity, and consistency rather than visual novelty.

Avoid generic AI-generated aesthetics, including:

- excessive gradients;
- excessive glassmorphism;
- excessive rounded cards;
- excessive shadows;
- glowing effects;
- unnecessary animations;
- decorative elements without functional purpose;
- repetitive dashboard/card layouts when another layout communicates better;
- excessive badges, pills, or floating elements;
- visually dense interfaces without clear hierarchy.

Prefer:

- clear visual hierarchy;
- readable typography;
- purposeful spacing;
- consistent design tokens;
- accessible contrast;
- responsive layouts;
- meaningful interaction states;
- restrained and purposeful visual styling;
- layouts that prioritize the actual student workflows.

Do not redesign an existing interface unless the task explicitly requests a redesign.

Reuse established design patterns once they are approved.

## Design Reference

When the user provides a Google Stitch screenshot or design:

- Treat the Stitch design as the primary visual reference for the requested UI.
- Reproduce its visual direction, layout hierarchy, spacing, typography, color usage, navigation structure, and interaction patterns where appropriate.
- Use the reference as design direction, not as generated code.
- Do not blindly copy details that conflict with accessibility, responsiveness, project requirements, or existing architecture.
- Do not invent additional decorative UI that is not supported by the design direction.
- Do not replace functional requirements with visual elements merely because they appear in the reference.
- Prefer production-ready implementation over unnecessary pixel-perfect complexity.
- Preserve the project's existing technical architecture while adapting the UI.
- If no Stitch or other explicit design reference is provided, follow the project's established UI patterns and the UI/UX guardrails above.

## Verification

Never claim a task is complete without appropriate verification.

Prefer the smallest relevant verification:

- PHP syntax/lint for PHP-only changes.
- Laravel tests for backend behavior.
- TypeScript/ESLint for frontend changes.
- Production build when routing, dependencies, configuration, or build-related code changes.
- Database migration status for migration work.
- Browser/runtime verification for UI behavior when applicable.

Rules:

- Do not run destructive commands unless explicitly requested or clearly required.
- Do not repeat expensive verification unnecessarily when no relevant files changed.
- If a verification cannot run because of the environment, report the exact limitation.
- Never hide a failed verification by calling the task complete.

## Git

Treat commits as checkpoints.

- Keep commits focused and atomic.
- Do not commit unrelated changes.
- Never use destructive Git commands to hide or discard user work.
- Before committing, inspect `git status` and the relevant diff.
- Do not modify unrelated files merely to make the working tree clean.
- Do not commit unless requested or the current workflow explicitly requires a checkpoint.

## Communication

Keep reports concise.

For implementation tasks, report:

1. What changed.
2. Verification performed.
3. Any remaining issue.

Additional rules:

- Do not dump unnecessary file contents into the response.
- Mention only files relevant to the task.
- If blocked by ambiguity, stop and ask rather than guessing.
- If an issue is unrelated to the requested task, report it but do not fix it automatically.
- Stop after the requested scope is complete.