# Cohort Review Web

Public site for JS -> TS cohort. Students paste their GitHub repo URL + day number, get a Claude-generated review, and land on the public feed and leaderboard.

Reads `../CLAUDE.md` (review rules) and `../curriculum/curriculum.md` (day-by-day requirements). Keep those two files up to date and the reviewer follows suit — no code change needed.

## Cost controls

- Model: `claude-haiku-4-5-20251001` (cheap)
- Prompt caching on rules + day section (~90% off on reuse)
- Commit-hash dedup: re-checking the same commit returns the stored review (free)
- Max 2 fresh reviews per (student, day) — bump `MAX_ATTEMPTS_PER_SUBMISSION` if needed
- 30-second per-IP rate limit
- Hard `SPEND_CAP_CENTS` in the DB (default 500 cents = $5). Also set the same cap on the API key itself in the Anthropic console — that's the only guard that cannot be bypassed.

## Local dev

```bash
cd web
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY and DATABASE_URL
npm run db:init
npm run dev
```

Open http://localhost:3000.

## Getting a Neon Postgres URL

1. https://neon.tech -> new project (free tier)
2. Copy the pooled connection string, paste as `DATABASE_URL`

## Deploy to Vercel

1. `git init && git add -A && git commit -m "web"` in the repo root
2. Push to GitHub
3. `vercel` (or import repo on vercel.com). Set the project root to `web/` in the import step, or add a `vercel.json` at the root.
4. Add env vars: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `ADMIN_PASSWORD`, and optionally `GITHUB_TOKEN`, `SPEND_CAP_CENTS`, `MAX_ATTEMPTS_PER_SUBMISSION`.
5. Deploy. Run `npm run db:init` once locally against the prod DB (or paste the SQL from `scripts/init-db.ts` into Neon's SQL editor).

## Notes

- `curriculum/curriculum.md` and `CLAUDE.md` must ship with the deployment. Because the web app lives in `web/` and reads `../curriculum/...`, deploy the whole repo, not just the `web/` subfolder. On Vercel: set the "Root Directory" to `web` and ensure the `curriculum/` and `CLAUDE.md` are included by leaving "Include source files outside of the Root Directory" enabled, or move them into `web/`.
- Admin route: pass `admin: "<ADMIN_PASSWORD>"` in the JSON body to bypass the per-submission cap and rate limit.

## Structure

```
web/
  app/                # pages + API routes
  lib/                # db, github, claude, curriculum, rateLimit
  scripts/init-db.ts  # creates tables
  package.json
```
