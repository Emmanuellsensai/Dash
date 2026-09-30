# Dash web app

Deterministic code checker for the JS to TS cohort. Students paste their GitHub repo URL and day number, get a review decided by the rule engine, and land on the public feed and leaderboard. Gemini adds advisory notes on comments and naming only.

## How a review is decided

1. The submit route loads the published day and its enabled rules from Neon.
2. The day's folder is fetched from the GitHub API.
3. `lib/engine/` parses every file (acorn for `.js`/`.mjs`/`.cjs`, typescript-estree for `.ts`/`.tsx`) and runs the day's rules. Status comes from rule results only: any failed required rule gives REDO, an advisory failure gives PASS WITH FIXES, everything passing gives PASS.
4. Gemini is called for advisory findings on comments and naming. It fails soft: on error, timeout or quota the review still saves.
5. The review, its rule results and its advisory notes are stored and shown on `/review/[id]`.

## Local dev

```bash
cd web
npm install
cp .env.example .env.local   # fill in DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET
npm run db:migrate
npm run dev
```

Open http://localhost:3000. Admin area: http://localhost:3000/admin/login.

## Env vars

| Var | Needed for |
| --- | --- |
| `DATABASE_URL` | pooled Neon connection for the app |
| `DATABASE_URL_UNPOOLED` | unpooled connection for migrations |
| `GITHUB_TOKEN` | optional, raises GitHub API rate limits |
| `ADMIN_PASSWORD` | `/admin/login` |
| `SESSION_SECRET` | signs the admin session cookie |
| `GEMINI_API_KEY` | advisory notes (optional, review still saves without it) |
| `GEMINI_MODEL` | which Gemini model to call |
| `GEMINI_DAILY_LIMIT` | cap on Gemini calls per day |
| `MAX_ATTEMPTS_PER_SUBMISSION` | attempts per (student, day), admin bypasses |

## Gemini advisory and free tier limits

Advisory notes use the official Google Gen AI SDK for JavaScript (`@google/genai`) with structured JSON output (`responseMimeType: application/json` plus `responseJsonSchema`). The model name always comes from `GEMINI_MODEL`, never from code.

Free tier facts from the official rate limits doc (https://ai.google.dev/gemini-api/docs/rate-limits, checked September 2026):

- Limits apply per Google Cloud project, not per API key.
- They are measured on three axes: requests per minute (RPM), tokens per minute (TPM) and requests per day (RPD).
- RPD quotas reset at midnight Pacific time. The `gemini_usage` table is keyed on that same Pacific date, so `GEMINI_DAILY_LIMIT` lines up with Google's reset.
- The free tier has no spend based rate limit (paid tiers do, returning 429 RESOURCE_EXHAUSTED).
- Exact per model numbers are account specific and shown in AI Studio (https://aistudio.google.com/rate-limit), so keep `GEMINI_DAILY_LIMIT` (default 50) comfortably below the RPD for your model.

Guard rails in the app:

- A single advisory call times out after 20 seconds and any error, quota hit or missing key stores `advisory = { status: "unavailable", reason }` while the deterministic review still saves.
- Advisory findings are post filtered: a finding is dropped if its line does not exist in the file, if the text contains fix style language, or if it contains backticks.
- Unchanged commits reuse the stored advisory, and the status never depends on Gemini.

## Getting a Neon Postgres URL

1. https://neon.tech -> new project (free tier)
2. Copy the pooled connection string, paste as `DATABASE_URL`

## Deploy to Vercel

1. Push the repo to GitHub
2. Import it on vercel.com, set the project root to `web/`
3. Add the env vars from the table above
4. Deploy, then run `npm run db:migrate` once locally against the prod DB (or paste the SQL from `scripts/migrate.ts` into Neon's SQL editor)

## Notes

- `curriculum/curriculum.md` must ship with the deployment. Because the web app lives in `web/` and reads `../curriculum/...`, deploy the whole repo, not just the `web/` subfolder. On Vercel: set "Root Directory" to `web` and leave "Include source files outside of the Root Directory" enabled.
- The admin area is protected by `middleware.ts` with a signed, httpOnly cookie. The old `admin` password field in the submit body is gone.

## Structure

```
web/
  app/                # pages + API routes (public, review, admin)
  lib/                # db, engine, gemini, github, curriculum, rateLimit, session
  scripts/migrate.ts  # idempotent schema migration
  tests/engine/       # vitest fixtures for the rule engine
  package.json
```
