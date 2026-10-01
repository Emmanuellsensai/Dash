# Progress: Dash deterministic code checker with Gemini advisory

Saved: 2026-10-01. This file exists so a new session can resume exactly where the last one stopped.

## Status summary

All 7 build phases are complete, committed locally on branch `neon-db_setup` and **not pushed**.
Phase 7 (verification with real data) **executed successfully on 2026-10-01**. Every check passes.

```
npx tsc --noEmit   PASS
npm run build      PASS
npm test           PASS (15 files, 80 tests)
npm run db:migrate RAN against web/.env.local, schema verified
Phase 7 script     PASS (login, curriculum import, day, 14 rules, dry run, submit, pages)
```

## Phase 7 verification results (2026-10-01)

Run against the real repo `https://github.com/Emmanuellsensai/javascript/tree/master/DAY%201`:

- Login, curriculum import (1102 chars, filenames experiments.js and converter.js), day 1
  creation, requirements publish and 14 rules all succeeded through the admin APIs.
- Dry run: REDO with 3/14 passing. Public submit: review 1, status REDO, 14 rule results,
  advisory `unavailable (GEMINI_MODEL is not set.)` as expected without Gemini env vars.
- All pages 200: `/review/1`, `/feed`, `/leaderboard`, `/`, `/admin/days/1`. Review page shows
  the rule checklist, the advisory section and file line evidence. Feed and leaderboard list the
  student.
- The REDO verdict is correct on real data. The student's actual files are named
  `experiment.js` (singular) and `conveter.js` (misspelled), so the 10 file name rules fail with
  "No file matching" evidence, and the code has a loose equality at `experiment.js` line 11.
- Follow up dry run with the two filename patterns corrected to the student's actual names gave
  12/14 passing, and the 2 remaining failures are genuine content failures: no SURPRISES comment
  block in experiment.js, and the loose equality at line 11. This confirms the dry run tuning
  loop works and the engine reports accurate file and line evidence.
- The script initially printed `admin lists day: false`. That was a check artifact: React SSR
  renders `Day<!-- -->1`, so the literal string `Day 1` is not in the HTML. The row renders.
  The script check now accepts the SSR comment form and passes.

Script fixes made during the run (file is untracked, see "Open decisions"):

1. The curriculum call was missing the session cookie, which gave 401 on the first run.
2. The admin page check now matches `Day<!-- -->1` as well as `Day 1`.

## Commits (local branch `neon-db_setup`, nothing pushed)

| Commit | Phase |
| --- | --- |
| `772ac3e` | 0: drop Claude and spend caps, Tailwind v4, admin cookie auth, Neon rate limit |
| `0f34014` | 1: migrate script, days/rules schema, db helpers, status function |
| `8b4109c` | 2: rule engine, 11 rule types, vitest suite (80 tests) |
| `af2313e` | 3: GitHub fetching with tree URLs, larger limits, visible truncation |
| `7ca3cf9` | 4: Gemini advisory layer, fail soft with quota |
| `404b815` | 5: submit pipeline on the engine, new review page |
| `2767a44` | 6: admin area (days, rules, dry run) |

Commit rules that must keep holding: no em dashes anywhere, no mention of Codebuff in commit
messages, commit after each phase, never push unless asked.

## What the app now is

- Deterministic rule engine in `web/lib/engine/` (parse.ts: acorn for `.js/.mjs/.cjs`,
  typescript-estree for `.ts/.tsx`; walk.ts; registry.ts; run.ts with `ENGINE_VERSION`;
  11 rule types in `rules/`). Only rule results decide status:
  any failed required rule gives REDO, failed advisory rule gives PASS_WITH_FIXES, else PASS
  (`web/lib/engine/status.ts`, pure function).
- Gemini (`web/lib/gemini.ts`, official `@google/genai` SDK) is advisory only: comments and
  naming, post filtered in `web/lib/advisoryFilter.ts` (line must exist, no fix language, no
  backticks, dedupe, cap 8), 20 s timeout, tracked in `gemini_usage` keyed on Pacific date,
  skipped at `GEMINI_DAILY_LIMIT`, fail soft always.
- Submit pipeline `web/app/api/submit/route.ts`: zod body, Neon rate limit, published day with
  enabled rules or 400 `Day N is not set up yet`, GitHub fetch, commit dedup, attempt cap,
  engine, advisory, plain text summary, saved with `rule_results`, `advisory`, `engine_version`.
- Admin area behind `web/middleware.ts` (jose cookie, `SESSION_SECRET`): `/admin`,
  `/admin/days/new`, `/admin/days/[n]` with day editor, rule editor (zod derived params forms),
  use strict toggle owning one system managed directive rule, curriculum import with ticked
  `file_exists` suggestions, and a dry run panel. APIs under `/api/admin/*`, all zod validated.
- Feedback never contains fixes. Helper text under the message field is fixed:
  "Describe what is missing or wrong. Do not say how to fix it."

## Hard rules to keep respecting

1. No mock, sample, placeholder or seeded fake data anywhere. Fixtures only under `web/tests/`.
2. Gemini output never changes the status.
3. Feedback never contains fixes: no "try", "should", "instead", "use X", "replace", "rename to",
   "change to", "consider" and no code suggestions, in engine text, helper text or Gemini output.
4. Student code is never executed, parse only.
5. No em dashes in code comments, UI copy, docs or commit messages.
6. Never print, log or commit secrets. Never edit `web/.env.local`; only `.env.example`.
7. Student code goes to Gemini delimited as data, instructions inside it are ignored.

## Environment state

- `web/.env.local` contains: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `ADMIN_PASSWORD`,
  `SESSION_SECRET`, `GITHUB_TOKEN` (present but EMPTY, the app then calls GitHub
  unauthenticated, fine for verification), `MAX_ATTEMPTS_PER_SUBMISSION`.
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_DAILY_LIMIT` are NOT set. The advisory stores
  `{ status: "unavailable", reason: "GEMINI_MODEL is not set." }` and reviews still save with a
  visible note. Expected, not a bug.
- Database is migrated and now contains real Phase 7 data: day 1 "Values, types, coercion"
  published with 14 rules, review 1 for student Emmanuellsensai with status REDO and full rule
  results. This is real user data from the real repo, not seeded fake data.
- Correct password admin login has now been tested end to end (the Phase 7 script logs in and
  holds the session through all admin calls).

## Environment gotchas discovered (read before running the server)

1. **Never run `next dev` and `next build` into the same `.next`.** A stale dev server was alive
   during a build, the dev server rewrote `.next/server/middleware.js` with an eval based bundle,
   and `next start` then failed every request with
   `EvalError: Code generation from strings disallowed for this context` (500 on all routes,
   including `/admin` login). Fix: stop every next process, `rm -rf .next`, rebuild, then start.
2. **`pkill -f "next ..."` patterns can match your own shell command line** (the command string
   contains the words `next dev`, `next start` or `.next`), which kills the shell and produces
   EMPTY tool output. Kill servers in a separate tool call, with patterns like
   `pkill -f "[n]ext-server"`, or kill by port.
3. Port 3000 must be free before `npm start` (`EADDRINUSE` otherwise). Check with
   `curl -s -m 3 -o /dev/null -w "%{http_code}" http://localhost:3000`.
4. The Neon driver in `web/lib/db.ts` uses a custom `https` fetch with IPv4 only, because the
   plain `@neondatabase/serverless` fetch times out on this machine. Do not remove that block,
   and do not verify the DB with raw `neon()` outside `lib/db.ts`.
5. Background servers started inside a tool call do not reliably survive to the next tool call.
   Start the server and run the verification inside the SAME tool call.
6. `npm run build` on this machine takes 5 to 7 minutes. A 300 second tool timeout kills the
   build during final manifest writes (symptom: `BUILD_ID` exists but `prerender-manifest.json`,
   `fallbacks-manifest.json` and `images-manifest.json` are missing, then `next start` 500s).
   Use a 600 second timeout, or write the build to a log file and check the exit code.
7. React SSR inserts `<!-- -->` between adjacent text nodes, so string checks on rendered HTML
   must accept `Day<!-- -->1` style output.

## Open decisions for the user

1. Keep or delete `web/scripts/verify-phase7.mjs` (untracked, now working end to end).
2. Commit the Phase 7 verification state (script fix plus this progress file) locally.
3. Whether to push the branch.
4. Whether to set the Gemini env vars in `web/.env.local` to see the advisory live.
