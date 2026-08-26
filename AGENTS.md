# AGENTS.md

## Architecture

3 apps + infrastructure, all orchestrated by Docker Compose:

| App | Stack | Port | Working Dir |
|---|---|---|---|
| Backend API | Laravel 11, PHP 8.2, MySQL 8, Redis | 8000 | `backend-api/` |
| Student Web | Next.js 16 (App Router), TailwindCSS v4, React 19, TS | 3000 | `student-web/` |
| Admin Web | Next.js 16 (App Router), TailwindCSS v4, React 19, TS | 3001 | `admin-web/` |

- Real-time: Laravel Reverb (WebSocket) via Redis Pub/Sub
- Auth: Laravel Sanctum (student), separate admin guard
- Storage: Local disk only (S3 is post-MVP)
- Maps: Leaflet.js + OpenStreetMap (no Google Maps)

## Dev Commands

Start everything:
```bash
docker-compose up -d --build
```

Backend setup (first time):
```bash
cp backend-api/.env.example backend-api/.env
# Edit .env to use MySQL (see ⚠️ below), then:
docker-compose exec php composer install
docker-compose exec php php artisan key:generate
docker-compose exec php php artisan migrate
```

Run backend commands:
```bash
docker-compose exec php php artisan <command>
```

Backend tests:
```bash
docker-compose exec php php artisan test          # all
docker-compose exec php php artisan test --filter=TestName  # single
```

Lint/typecheck frontends (no script yet — run manually):
```bash
# From repo root, inside Docker or locally:
cd student-web && npm run lint
cd admin-web && npm run lint
```

## ⚠️ Critical: `.env.example` vs Docker

The `.env.example` defaults to **SQLite** (`DB_CONNECTION=sqlite`). Docker Compose runs **MySQL 8**. You must update `.env` after copying:

```
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=student_hub
DB_USERNAME=upn_user
DB_PASSWORD=secretpassword

REDIS_HOST=redis
```

MySQL credentials are defined in `docker-compose.yml`: database `student_hub`, user `upn_user`, password `secretpassword`.

## Repo Structure

This is **not a JS monorepo** — no workspace manager. Each app is independent with its own `package.json` / `composer.json`. They are linked only by Docker Compose networking and the `NEXT_PUBLIC_API_URL=http://localhost:8000` env var.

- `backend-api/` — Laravel skeleton. Only default migration files exist so far; no custom controllers, models, or API routes yet.
- `student-web/` — Next.js app for students. `src/app/` (App Router pages), `src/lib/` (utilities).
- `admin-web/` — Next.js app for admins. Same structure as student-web.
- `docker/nginx/` — Reverse proxy routing ports 8000→Laravel, 3000→student-web, 3001→admin-web.
- `docker/php/` — PHP 8.2 FPM with extensions: pdo_mysql, redis, gd, mbstring, bcmath.

## Key Conventions

- **Language**: UI and docs are in **Bahasa Indonesia**.
- **API prefix**: All API routes go under `/api/v1/`.
- **Polymorphic design**: Media, Favorites, Reports, Ratings all use Laravel polymorphic relations. Design is documented in `SYSTEM_ANALYSIS.md`.
- **File storage**: Only relative paths stored in DB (e.g. `listings/abc123.jpg`). Absolute URLs built in API resource layer.
- **No group chat**: MVP is 1-on-1 only.
- **Soft deletes**: All listing tables use `deleted_at` for moderation.

## Testing

- PHPUnit configured in `backend-api/phpunit.xml` (Unit + Feature suites).
- Test env uses array/cache drivers by default.
- No tests written yet. DB-based tests will need MySQL (uncomment `DB_CONNECTION`/`DB_DATABASE` in phpunit.xml or use the Docker env).

## Current State

Project is at **Phase 1** (foundation). Only Laravel skeleton + Next.js scaffolds exist. No custom business logic, migrations, controllers, or frontend pages have been implemented yet. See `SYSTEM_ANALYSIS.md` for the full architecture spec and roadmap.


## AI Agent Workflow & Guardrails

- **SYSTEM_ANALYSIS.md is the Source of Truth.**
- **Do not change architecture without explicit approval.**
- **Do not implement Post-MVP features unless explicitly requested.**
- Keep all implementation suitable for a solo developer.
- Prefer the simplest solution that satisfies the requirements.
- Do not introduce new infrastructure, services, frameworks, or dependencies unless necessary and approved.
- Do not introduce: Python microservices, Google Maps, S3/MinIO, Group Chat, or other Post-MVP architecture.

Before modifying architecture or writing significant code:
1. Inspect the existing implementation.
2. Read the relevant sections of `SYSTEM_ANALYSIS.md`.
3. Explain the proposed change and why it is necessary.
4. Implement only the approved scope.
5. Run appropriate verification/tests.
6. Report what was changed and any remaining issues.
7. Stop at the requested phase.

When requirements conflict with `SYSTEM_ANALYSIS.md`, **do not make assumptions**. Stop and ask for clarification.