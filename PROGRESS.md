# Progress: Dash deterministic code checker with Gemini advisory

Saved: 2026-10-01. This file exists so a new session can resume exactly where the last one stopped.

## Status summary

All 7 build phases are complete, committed locally and **not pushed**. Every code check passes.
Phase 7 (verification with real data) is the only phase left: the automated end to end script has
been written but has not yet succeeded against a healthy server, because earlier attempts hit
environment issues (stale dev server, polluted `.next` build), not code issues.

```
npx tsc --noEmit   PASS
npm run build      PASS
npm test           PASS (15 files, 80 tests)
npm run db:migrate RAN against web/.env.local, schema verified
```

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

- `web/.env.local` now contains: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `ADMIN_PASSWORD`,
  `SESSION_SECRET` (added by the user), `GITHUB_TOKEN` (present but EMPTY, the app then calls
  GitHub unauthenticated, fine for verification), `MAX_ATTEMPTS_PER_SUBMISSION`.
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_DAILY_LIMIT` are NOT set. The advisory will store
  `{ status: "unavailable", reason: "GEMINI_MODEL is not set." }` and reviews still save with a
  visible note. That is expected, not a bug.
- Database (`DATABASE_URL` in `web/.env.local`) is migrated and currently EMPTY: 0 days,
  0 rules, 0 reviews, 0 students. Verified after the last failed attempt.
- GitHub API reachable from this machine. The repo used for verification is public.

## Values provided by the user for Phase 7

- Repo URL: `https://github.com/Emmanuellsensai/javascript/tree/master/DAY%201`
  (folder `DAY 1` on branch `master`, URL decoded by `parseRepo`)
- Day number: `1`
- Day title used: `Values, types, coercion`
- Student name for the public submission: `Emmanuellsensai`

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

## Exact resume steps (Phase 7, steps 3 to 5)

1. Make sure nothing is listening on 3000 (own tool call):
   ```bash
   pgrep -af "[n]ext"; pkill -f "[n]ext-server" 2>/dev/null; pkill -f "[n]ext dev" 2>/dev/null
   ```
2. Clean production build (own tool call, cwd `web`):
   ```bash
   rm -rf .next && npm run build
   ```
3. Start the server and run the verification script in ONE tool call (cwd `web`):
   ```bash
   (npm start > /tmp/dash-verify.log 2>&1 &)
   for i in $(seq 1 40); do code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || true); [ "$code" = "200" ] && break; sleep 1; done
   echo "server ready: $code"
   node scripts/verify-phase7.mjs
   STATUS=$?
   pkill -f "[n]ext-server" 2>/dev/null
   exit $STATUS
   ```
4. What `web/scripts/verify-phase7.mjs` does and prints, in order:
   - logs into `/api/admin/login` using `ADMIN_PASSWORD` from `web/.env.local` (value never printed),
   - imports day 1 requirements from `curriculum/curriculum.md` via `/api/admin/curriculum?day=1`,
   - creates day 1, fills requirements, publishes it (aborts with a clear message if day 1 already
       exists; if that happens delete it in `/admin` first, the DB was empty at save time),
   - creates 14 real rules: file_exists experiments.js and converter.js, comment_contains
       SURPRISES, syntax_present template_literal and typeof in experiments.js, strict_equality in
       `**/*.js`, syntax_forbidden loose_equality, four function_defined rules for nairaToUsd,
       usdToNaira, celsiusToFahrenheit and kgToPounds with mustReturnValue, call_usage
       console.log top level min 1 (required) and inside function max 0 (advisory),
       naming_convention functions camelCase in converter.js (advisory),
   - runs the dry run against the real repo with `useGemini: true`, prints status, per rule
       failures with file and line evidence, and the advisory status (expected:
       `unavailable (GEMINI_MODEL is not set.)`),
   - submits the same repo through the public `/api/submit`,
   - checks `/review/<id>`, `/feed`, `/leaderboard`, `/` and `/admin/days/1` return 200 and that
       the review page shows the rule checklist, the advisory section and file line evidence.
5. Possible legitimate outcomes that are NOT failures: the review status may be REDO or PASS
   WITH FIXES depending on what is actually in the `DAY 1` folder of the real repo; the
   advisory is unavailable until Gemini env vars are set.
6. If a rule fails because a file lives in a subfolder (for example the pattern `experiments.js`
   does not match `src/experiments.js`), adjust that rule's `file_pattern` in the script or in
   `/admin/days/1` and rerun. The dry run exists for exactly this.
7. After a successful run, produce the final report required by Phase 7: what changed, files
   added and removed, env vars needed, anything not verified. Decide with the user whether
   `web/scripts/verify-phase7.mjs` stays (it is currently untracked) or is deleted.

## Verification already done before this file was written

- `npx tsc --noEmit`, `npm run build`, `npm test` all green on the final code.
- `npm run db:migrate` succeeded; schema checked: `days`, `rules`, `rate_limits`, `gemini_usage`
  created, `reviews` has `rule_results`, `advisory`, `engine_version` and no model/token/cost
  columns, `students` and `submissions` unchanged.
- Dev server smoke test: `/`, `/feed`, `/leaderboard`, `/admin/login` returned 200, `/admin`
  redirected to `/admin/login?next=%2Fadmin`, empty submit body returned the zod 400, wrong admin
  password returned 401. Correct password returned 500 only because `SESSION_SECRET` was missing
  at that time; the user has since added it (grep confirms both `ADMIN_PASSWORD` and
  `SESSION_SECRET` exist), but the correct password path has NOT been retested yet.
- A fresh clean production build completed at 01:33 on 2026-10-01 (`.next/BUILD_ID` fresh,
  `middleware.js` has no eval). No server is running and no day data exists yet.
