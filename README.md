# Dash

AI grader for a 30-day JavaScript → TypeScript cohort. Students paste a public GitHub repo URL and a day number; Dash pulls that day's folder, sends it to Claude with the day's curriculum requirements and the review rubric ([CLAUDE.md](CLAUDE.md)), and publishes the review to a public feed and leaderboard.

## Repo layout

```
.
├── CLAUDE.md              # review rules (the rubric the grader follows)
├── curriculum/
│   └── curriculum.md      # 30-day curriculum, source of truth for what each day requires
├── students.md            # roster (name + repo URL)
├── reviews/               # teacher-written reviews (optional, for manual grading)
├── progress/              # per-student status log
├── repos/                 # local clones of student repos (gitignored)
├── .claude/commands/
│   └── review.md          # slash command for reviewing from Claude Code
└── web/                   # Next.js app — the public site
```

## The web app

Everything the students and teacher touch lives at `/web`. See [web/README.md](web/README.md) for setup and deploy.

Key features:

- **Submit for review**: paste repo URL + day number → instant Claude review, stored publicly
- **Leaderboard**: PASS = 3, PASS WITH FIXES = 1, plus earliness bonuses (+5/+3/+2 for the first three to pass each day)
- **Public feed**: everyone can see everyone's reviews (this is intentional — encourages sharing and learning)
- **Cost guards**: cached prompts, commit-hash dedup, 2 attempts per (student, day), 30s/IP rate limit, DB-tracked hard spend cap, plus a per-key cap on the Anthropic side

## Costs

Runs on Claude Haiku 4.5 with prompt caching. Full cohort of 30 students × 30 days ≈ **$5–10** total. See [web/README.md](web/README.md#cost-controls) for the guards.

## Adding a new day to the curriculum

Just append it to `curriculum/curriculum.md` in the same `### DAY N: TITLE` format. Nothing else to change — the reviewer reads the file at request time and only sends that one day's section to Claude.

## Tweaking how it grades

Edit [CLAUDE.md](CLAUDE.md). The reviewer reads it fresh on every request (cached for cost), so any change there changes how new reviews look.
