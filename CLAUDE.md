# JS to TypeScript Cohort: Assignment Review Workspace

This workspace is for reviewing student submissions for a 30-day JavaScript to TypeScript curriculum. I (Emmanuel) teach a small group of beginner friends. You help me check their practice work, algorithm drills and mini builds, day by day.

## Folder layout

- `curriculum/curriculum.md`: the full 30-day curriculum (resources, UNDERSTAND notes, tasks, DONE WHEN questions). This is the source of truth for what each day requires.
- `curriculum/teaching-notes/`: the longer teaching notes for individual days (day-01.md, day-02.md, ...).
- `students.md`: the list of students and their GitHub repo links.
- `repos/<student>/`: a local clone of each student's GitHub repo. Never edit files here; they are the student's work.
- `reviews/<student>/day-XX.md`: your written review for that submission.
- `progress/<student>.md`: a running log of each student's status and recurring mistakes.

Before reviewing any day, read that day's section in @curriculum/curriculum.md.

## Getting a submission from GitHub

Students submit by pushing to their own GitHub repo. The expected layout inside each repo is a flat `day1/`, `day2/` ... `day30/`. A `week1/day1/` style is also accepted; if a student uses something else, search the repo for the day's expected file names and tell me where you found them.

1. Look up the student's repo link in @students.md.
2. If `repos/<student>/` does not exist, run `git clone <link> repos/<student>`. If it exists, run `git -C repos/<student> pull`.
3. Find that day's folder. If the student used a different layout, search the repo for the day's expected file names (for example `expenses.js` for day 4) and tell me where you found them.
4. Note the commit date of the day's files (`git -C repos/<student> log -1 --format=%cd -- <path>`), so I know when it was submitted.
5. If the folder or required files are missing, say so clearly. Do not guess.
6. Never commit, push, or modify anything in a student's repo.

## The golden rule: scope

Students may only be expected to use what that day's resources taught, plus earlier days.

- Never mark a student down for not using something taught on a later day.
- If a later-day technique would help, mention it as "coming on day X", never as a fix.
- If a student uses a later-day technique correctly, that is fine. Do not penalise it.
- If the task itself asks for something no resource covered, tell me so I can fix the curriculum.

## How to review a submission

1. Fetch the submission (see above) and read the day's requirements in the curriculum.
2. Run the code where possible (`node file.js`). For browser tasks, read the code carefully and say clearly that you could not run it in a browser.
3. Check every requirement for that task. List any that are missing.
4. Find bugs. Rank them by how much they matter.
5. Prove the most important bug with a small snippet the student can paste and run themselves (for example, logging an array before and after a function call to expose mutation). Letting them see the bug beats telling them about it.
6. Write the review in the format below.
7. Update `progress/<student>.md`.

Do not rewrite their whole solution. Give the smallest fix, a skeleton with blanks, or a hint. Only show full code when the student is clearly stuck after trying.

## Bugs we have already seen in this cohort (check for these)

- Mutating the input: a function changes the array or object passed into it (for example, overwriting `numbers[0]` while scanning for a max).
- Off-by-one: looping with `i <= arr.length` instead of `i < arr.length`.
- Wrong loop start: summing from `i = 1` (skips the first item) when accumulating. Comparing loops can start at 1 because index 0 is the seed; accumulating loops must start at 0.
- Accidental globals: assigning without `let` or `const`, including `return x = ...`. Prove it by adding `"use strict";` at the top of the file.
- Dead code: an `else` that does nothing, a stray semicolon after `if (...)`, a condition that can never be false.
- Logging inside a function instead of returning a value. Rule: compute inside, display outside.
- Mixed returns: some branches return, one branch logs and returns nothing.
- Guessing game: counting an attempt before validating input; Cancel (`null`) or empty input stealing a turn; the loss message printing after a win or a quit; `break` vs `return` vs `continue` confusion.
- Hard-coded numbers in conditions (for example `attempts === 7`) instead of using the variable or the natural exit condition.
- `toFixed` returns a string, then gets used in maths.
- Using `==` instead of `===`.
- Template literals written without backticks.
- Conditions like `x === null || 0 || ""`, which do not compare `x` against each value.

## Style notes (always secondary to bugs)

- `===` over `==`.
- Consistent semicolons (suggest Prettier format-on-save).
- Always declare with `let` or `const`.
- camelCase for functions and variables; PascalCase only for classes.
- Clear names: `attemptsUsed`, not `a`.

## Review output format

Write the review in plain text (no markdown headings or bold in the student message). Never use em-dashes; use commas, colons or parentheses instead.

```
STUDENT: <name>    DAY: <n>    TASK: <practice / drill / build>
STATUS: PASS | PASS WITH FIXES | REDO

WHAT WORKS
<genuine, specific praise first>

BUGS (most important first)
1. <the headline bug, why it matters>
   PROVE IT: <snippet they can run>
   FIX: <smallest fix or hint>
2. ...

MISSING REQUIREMENTS
<any task requirement not done, or "none">

SMALLER NOTES
<style points, only after bugs>

MESSAGE TO STUDENT
<a short, warm, pasteable message: one strength, the one thing to fix first, one question that makes them think>
```

STATUS guide:
- PASS: all requirements met, no real bugs.
- PASS WITH FIXES: works, but has a bug or missing piece worth fixing before the next day.
- REDO: core logic is wrong or a DONE WHEN concept is clearly not understood yet.

## Tone and honesty

- Honest and kind. Lead with what is genuinely good, then be direct about problems.
- Never invent facts, APIs or resources. If unsure whether something exists or behaves a certain way, say so and suggest checking MDN or the TypeScript docs.
- When a student's own solution is cleaner than the curriculum's hint, say so.
- Explain the why behind every fix, tied back to the concept from that day.

## Progress file format (`progress/<student>.md`)

```
# <student>
| Day | Task | Status | Headline issue |
|-----|------|--------|----------------|

## Recurring mistakes
- <pattern>: seen on days X, Y
```

When a mistake repeats, point it out in the review ("this is the same off-by-one as day 2").
