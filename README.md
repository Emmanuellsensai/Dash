# Dash

Deterministic code checker for a 30-day JavaScript to TypeScript cohort. Students paste a public GitHub repo URL and a day number; Dash pulls that day's folder from GitHub, runs a rule engine over the code, stores the review, and publishes it to a public feed and leaderboard.

## How grading works

- A rule engine parses each file into an AST (acorn for JavaScript, typescript-estree for TypeScript) and checks it against per-day rules stored in Neon. The engine alone decides PASS, PASS WITH FIXES or REDO.
- Gemini is an advisory layer for two things only: quality of comments and clarity of naming. Its notes never affect the status.
- The teacher defines each day's requirements and rules in the admin area at `/admin`.
- Feedback says what is wrong and where (file and line). It never says how to fix it.

## Repo layout

```
.
├── curriculum/
│   └── curriculum.md      # 30-day curriculum, source of truth for what each day requires
├── web/                   # Next.js app: public site, admin area and API
└── commands/              # local helper commands
```

## The web app

Everything the students and teacher touch lives at `/web`. See [web/README.md](web/README.md) for setup and deploy.

Key features:

- **Submit for review**: paste repo URL + day number, the rule engine reviews the day folder
- **Leaderboard**: PASS = 3, PASS WITH FIXES = 1, plus earliness bonuses (+5/+3/+2 for the first three to pass each day)
- **Public feed**: everyone can see everyone's reviews (this is intentional, it encourages sharing and learning)
- **Admin area**: `/admin` defines per-day requirements, rules and a dry run against a real repo
- **Guards**: commit-hash dedup, per-day attempt cap, 30s/IP rate limit backed by Neon

## Adding a new day to the curriculum

Append it to `curriculum/curriculum.md` in the same `### DAY N: TITLE` format. The admin area can import that section as the day's requirements text.

## Changing how it grades

Edit the day's rules in the admin area. Each rule is a type from `web/lib/engine/`, a file pattern, params, a failure message and a severity. New rule types are added as one file in `web/lib/engine/` plus one registry line.
