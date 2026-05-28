# Simple Adaptable Storage

A lightweight, self-hosted platform for managing candidate / student profiles in a training organization — registration, document storage (CV, ID), filterable search, and AI-graded skill tests.

## Stack

| Layer       | Tech                                           |
| ----------- | ---------------------------------------------- |
| Runtime     | [Bun](https://bun.com) 1.3                     |
| Framework   | [SvelteKit](https://svelte.dev) 2 + Svelte 5   |
| Build       | Vite 6                                         |
| Styling     | Tailwind CSS 4                                 |
| Auth        | [Better Auth](https://better-auth.com) (cookies, email verification, password reset) |
| Database    | PostgreSQL 17 via [Drizzle ORM](https://orm.drizzle.team) |
| AI grading  | OpenAI Responses API (`gpt-4o-mini`) — optional, falls back to a deterministic heuristic |

## Quick start (Docker)

```bash
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD, BETTER_AUTH_SECRET (>= 32 chars), SMTP_*, OPENAI_API_KEY
docker compose up -d --build
docker compose exec app bun run db:seed   # one-time: insert formations + sample tests
```

App runs at [http://localhost:3000](http://localhost:3000).

## Local development

```bash
bun install
# Start a Postgres locally (any way you like). Example with Docker:
docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=sas -e POSTGRES_USER=app --name sas-pg postgres:17-alpine

cp .env.example .env
bun run db:migrate
bun run db:seed
bun run dev
```

## Project layout

```
src/
├── app.html / app.css / app.d.ts
├── hooks.server.ts          # session resolution + BetterAuth wiring
├── lib/
│   ├── auth-client.ts       # Svelte client for sign-in / sign-up
│   ├── components/          # Header, Footer, Field, TagInput, ChipGroup, FileSlot, Alert
│   └── server/
│       ├── auth.ts          # BetterAuth instance (email/password + verification + reset)
│       ├── db/              # Drizzle: schema, client, migrations, seed
│       ├── mailer.ts        # nodemailer (SMTP) with dev fallback to console
│       ├── uploads.ts       # File validation, storage, safe path resolution
│       ├── watermark.ts     # PDF watermarking via pdf-lib
│       ├── geocode.ts       # French city → (lon, lat) via geo.api.gouv.fr
│       ├── grader.ts        # OpenAI test grader + heuristic fallback
│       └── guards.ts        # requireUser / requireAdmin
└── routes/
    ├── +layout.{svelte,server.ts}
    ├── +page.svelte                  # landing
    ├── signin/                       # /signin
    ├── register/                     # /register (uses /api/register for multipart)
    ├── reset-password/               # /reset-password (request + confirm)
    ├── legal/                        # /legal
    ├── profile/                      # /profile (candidate self-service)
    ├── admin-panel/
    │   ├── +page.{svelte,server.ts}  # filterable candidate list
    │   └── u/[id]/                   # single candidate edit
    ├── test/                         # skills assessment
    └── api/
        ├── auth/[...all]/            # BetterAuth handler
        ├── register/                 # multipart sign-up + uploads + geocode
        ├── files/[kind]/             # candidate: upload/delete own files
        ├── me/files/[kind]/          # candidate: read own files
        ├── admin/
        │   ├── search/               # admin candidate search (paginated)
        │   ├── update-status/
        │   └── files/[id]/[kind]/    # admin: read/write any candidate's files
        └── test/{next,response}/     # serve question / score answer
```

## Database schema

| Table             | Purpose                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `formations`      | Training programs                                                  |
| `user_profiles`   | Domain data per user (1-1 with `user`, FK to formation)            |
| `staff_settings`  | Maps admin user → formation(s) they can see                        |
| `tests`           | Question bank (type: 1 front, 2 back, 3 psycho × difficulty 1-3)   |
| `test_attempts`   | Candidate answers + AI score                                       |
| `user`, `session`, `account`, `verification` | BetterAuth core tables          |

Migration files live under `src/lib/server/db/migrations/`. Regenerate with `bun run db:generate` after editing `schema.ts`.

## Routes

| Path                | Access | Description                              |
| ------------------- | ------ | ---------------------------------------- |
| `/`                 | Public | Landing                                  |
| `/register`         | Public | Candidate sign-up (multipart, with CV / ID upload, French geocoding) |
| `/signin`           | Public | Login                                    |
| `/reset-password`   | Public | Request and confirm password reset       |
| `/legal`            | Public | Legal notices                            |
| `/profile`          | Auth   | Self-service profile edit + documents    |
| `/test`             | Auth   | Skills assessment, AI-graded             |
| `/admin-panel`      | Admin  | Filterable candidate list                |
| `/admin-panel/u/:id`| Admin  | Single candidate page                    |

## Promoting an admin

There's no UI yet — flip the flag directly:

```sql
UPDATE user_profiles SET is_admin = true WHERE user_id = '<id>';
INSERT INTO staff_settings (staff_user_id, formation_id) VALUES ('<id>', <formation_id>);
```

Admins only see candidates from formations they're mapped to via `staff_settings`.

## File storage

Uploaded files go under `UPLOADS_DIR` (defaults to `./uploads`), one folder per user (`u_<userId>/`). PDFs uploaded as CV are automatically watermarked using `static/watermark.png` if present.

## AI grading

`OPENAI_API_KEY` enables strict 0–100 grading via the Responses API with a JSON schema. Without a key, [`src/lib/server/grader.ts`](src/lib/server/grader.ts) falls back to a deterministic keyword-overlap heuristic — the test flow still works end-to-end in dev.

## Scripts

```
bun run dev          # vite dev server
bun run build        # production build
bun run start        # serve the built app
bun run check        # svelte-check
bun run db:generate  # drizzle-kit generate (after editing schema.ts)
bun run db:migrate   # apply migrations
bun run db:seed      # insert formations + sample tests
```

## Security notes

- Sessions are HTTP-only cookies, 7-day expiry, signed by `BETTER_AUTH_SECRET` (must be ≥ 32 chars).
- File uploads are size-capped (`MAX_UPLOAD_BYTES`), MIME- and extension-checked, and stored outside the public tree.
- File serving validates ownership in both candidate and admin endpoints (no path traversal — see `toAbsFromStored`).
- The admin search uses parameterized SQL (Drizzle) and an explicit `staff_settings` scope — admins cannot see candidates outside their assigned formations.
