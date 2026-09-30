import https from "node:https";
import { neon, neonConfig } from "@neondatabase/serverless";
import type { RuleResult } from "./engine/types";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

neonConfig.fetchFunction = (input: string | URL, init: RequestInit = {}) =>
  new Promise<Response>((resolve, reject) => {
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const request = https.request(
      input,
      { method: init.method, headers, family: 4, timeout: 15000 },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const responseHeaders = new Headers();
          for (const [name, value] of Object.entries(response.headers)) {
            if (typeof value === "string") responseHeaders.set(name, value);
            else if (Array.isArray(value)) {
              for (const item of value) responseHeaders.append(name, item);
            }
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode,
              statusText: response.statusMessage,
              headers: responseHeaders,
            }),
          );
        });
      },
    );

    request.on("timeout", () => request.destroy(new Error("Database request timed out")));
    request.on("error", reject);
    if (typeof init.body === "string" || init.body instanceof Uint8Array) {
      request.write(init.body);
    } else if (init.body instanceof ArrayBuffer) {
      request.write(Buffer.from(init.body));
    }
    request.end();
  });

export const sql = neon(process.env.DATABASE_URL);

export type ReviewStatus = "PASS" | "PASS_WITH_FIXES" | "REDO";

export interface Student {
  id: number;
  name: string;
  repo_url: string;
  created_at: string;
}

export interface Submission {
  id: number;
  student_id: number;
  day_number: number;
  commit_sha: string | null;
  attempts: number;
  first_reviewed_at: string;
}

export interface Review {
  id: number;
  submission_id: number;
  status: ReviewStatus;
  body: string;
  rule_results: RuleResult[];
  advisory: Advisory | null;
  engine_version: string;
  created_at: string;
  student_name?: string;
  day_number?: number;
}

export interface AdvisoryFinding {
  category: "comments" | "naming";
  file: string;
  line: number;
  severity: "note" | "issue";
  problem: string;
}

export interface Advisory {
  status: "ok" | "unavailable" | "skipped";
  reason?: string;
  findings?: AdvisoryFinding[];
}

export interface Day {
  day_number: number;
  title: string;
  requirements_md: string;
  require_use_strict: boolean;
  published: boolean;
  updated_at: string;
}

export interface Rule {
  id: number;
  day_number: number;
  position: number;
  type: string;
  file_pattern: string;
  params: Record<string, unknown>;
  message: string;
  severity: "required" | "advisory";
  enabled: boolean;
  system_managed: boolean;
}

export interface DayWithRules {
  day: Day;
  rules: Rule[];
}

export async function upsertStudent(name: string, repoUrl: string): Promise<Student> {
  const rows = (await sql`
    insert into students (name, repo_url)
    values (${name}, ${repoUrl})
    on conflict (repo_url) do update set name = excluded.name
    returning *
  `) as Student[];
  return rows[0];
}

export async function getOrCreateSubmission(
  studentId: number,
  day: number,
  commitSha: string | null,
): Promise<Submission> {
  const existing = (await sql`
    select * from submissions
    where student_id = ${studentId} and day_number = ${day}
    limit 1
  `) as Submission[];
  if (existing.length) return existing[0];
  const inserted = (await sql`
    insert into submissions (student_id, day_number, commit_sha)
    values (${studentId}, ${day}, ${commitSha})
    returning *
  `) as Submission[];
  return inserted[0];
}

export async function incrementAttempts(submissionId: number, commitSha: string | null) {
  await sql`
    update submissions
    set attempts = attempts + 1,
        commit_sha = coalesce(${commitSha}, commit_sha)
    where id = ${submissionId}
  `;
}

export async function insertReview(row: {
  submissionId: number;
  status: ReviewStatus;
  body: string;
  ruleResults: RuleResult[];
  advisory: Advisory | null;
  engineVersion: string;
}): Promise<Review> {
  const rows = (await sql`
    insert into reviews
      (submission_id, status, body, rule_results, advisory, engine_version)
    values
      (${row.submissionId}, ${row.status}, ${row.body},
       ${JSON.stringify(row.ruleResults)}::jsonb,
       ${row.advisory ? JSON.stringify(row.advisory) : null}::jsonb,
       ${row.engineVersion})
    returning *
  `) as Review[];
  return rows[0];
}

export async function getPublishedDays(): Promise<Day[]> {
  return (await sql`
    select * from days where published = true order by day_number asc
  `) as Day[];
}

export async function getAllDays(): Promise<Day[]> {
  return (await sql`select * from days order by day_number asc`) as Day[];
}

export async function getDay(dayNumber: number): Promise<Day | null> {
  const rows = (await sql`
    select * from days where day_number = ${dayNumber} limit 1
  `) as Day[];
  return rows[0] ?? null;
}

export async function getDayWithRules(
  dayNumber: number,
  opts: { enabledOnly?: boolean } = {},
): Promise<DayWithRules | null> {
  const day = await getDay(dayNumber);
  if (!day) return null;
  const rules = opts.enabledOnly
    ? ((await sql`
        select * from rules
        where day_number = ${dayNumber} and enabled = true
        order by position asc, id asc
      `) as Rule[])
    : ((await sql`
        select * from rules
        where day_number = ${dayNumber}
        order by position asc, id asc
      `) as Rule[]);
  return { day, rules };
}

export interface DayInput {
  day_number: number;
  title: string;
  requirements_md?: string;
  require_use_strict?: boolean;
  published?: boolean;
}

export async function createDay(input: DayInput): Promise<Day> {
  const rows = (await sql`
    insert into days (day_number, title, requirements_md, require_use_strict, published)
    values (${input.day_number}, ${input.title}, ${input.requirements_md ?? ""},
            ${input.require_use_strict ?? false}, ${input.published ?? false})
    returning *
  `) as Day[];
  return rows[0];
}

export async function updateDay(
  dayNumber: number,
  input: Partial<DayInput>,
): Promise<Day | null> {
  const rows = (await sql`
    update days set
      title = coalesce(${input.title ?? null}, title),
      requirements_md = coalesce(${input.requirements_md ?? null}, requirements_md),
      require_use_strict = coalesce(${input.require_use_strict ?? null}, require_use_strict),
      published = coalesce(${input.published ?? null}, published),
      updated_at = now()
    where day_number = ${dayNumber}
    returning *
  `) as Day[];
  return rows[0] ?? null;
}

export async function deleteDay(dayNumber: number): Promise<void> {
  await sql`delete from days where day_number = ${dayNumber}`;
}

export interface RuleInput {
  day_number: number;
  position: number;
  type: string;
  file_pattern?: string;
  params?: Record<string, unknown>;
  message: string;
  severity: "required" | "advisory";
  enabled?: boolean;
  system_managed?: boolean;
}

export async function createRule(input: RuleInput): Promise<Rule> {
  const rows = (await sql`
    insert into rules
      (day_number, position, type, file_pattern, params, message, severity, enabled, system_managed)
    values
      (${input.day_number}, ${input.position}, ${input.type},
       ${input.file_pattern ?? "**/*.js"}, ${JSON.stringify(input.params ?? {})}::jsonb,
       ${input.message}, ${input.severity}, ${input.enabled ?? true},
       ${input.system_managed ?? false})
    returning *
  `) as Rule[];
  return rows[0];
}

export async function updateRule(
  id: number,
  input: Partial<Omit<RuleInput, "day_number">>,
): Promise<Rule | null> {
  const rows = (await sql`
    update rules set
      position = coalesce(${input.position ?? null}, position),
      type = coalesce(${input.type ?? null}, type),
      file_pattern = coalesce(${input.file_pattern ?? null}, file_pattern),
      params = coalesce(${input.params ? JSON.stringify(input.params) : null}::jsonb, params),
      message = coalesce(${input.message ?? null}, message),
      severity = coalesce(${input.severity ?? null}, severity),
      enabled = coalesce(${input.enabled ?? null}, enabled),
      system_managed = coalesce(${input.system_managed ?? null}, system_managed)
    where id = ${id}
    returning *
  `) as Rule[];
  return rows[0] ?? null;
}

export async function deleteRule(id: number): Promise<void> {
  await sql`delete from rules where id = ${id}`;
}

export async function getRule(id: number): Promise<Rule | null> {
  const rows = (await sql`select * from rules where id = ${id} limit 1`) as Rule[];
  return rows[0] ?? null;
}

export async function ruleCounts(): Promise<{ day_number: number; count: number }[]> {
  return (await sql`
    select day_number, count(*)::int as count
    from rules
    group by day_number
    order by day_number asc
  `) as { day_number: number; count: number }[];
}

export async function setRuleOrder(ids: number[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    await sql`update rules set position = ${i + 1} where id = ${ids[i]}`;
  }
}

export async function nextRulePosition(dayNumber: number): Promise<number> {
  const rows = (await sql`
    select coalesce(max(position), 0) + 1 as next from rules where day_number = ${dayNumber}
  `) as { next: number }[];
  return rows[0].next;
}

export async function incrementGeminiUsage(day: string): Promise<number> {
  const rows = (await sql`
    insert into gemini_usage (day, count)
    values (${day}::date, 1)
    on conflict (day) do update set count = gemini_usage.count + 1
    returning count
  `) as { count: number }[];
  return rows[0].count;
}

export async function geminiUsage(day: string): Promise<number> {
  const rows = (await sql`
    select count from gemini_usage where day = ${day}::date
  `) as { count: number }[];
  return rows[0]?.count ?? 0;
}

/**
 * Reuse a stored advisory for the same commit so an unchanged submission
 * does not spend another Gemini call.
 */
export async function cachedAdvisory(
  submissionId: number,
  commitSha: string | null,
): Promise<Advisory | null> {
  if (!commitSha) return null;
  const rows = (await sql`
    select r.advisory
    from reviews r
    join submissions s on s.id = r.submission_id
    where r.submission_id = ${submissionId}
      and s.commit_sha = ${commitSha}
      and r.advisory is not null
      and r.advisory->>'status' = 'ok'
    order by r.created_at desc
    limit 1
  `) as { advisory: Advisory }[];
  return rows[0]?.advisory ?? null;
}

export async function latestReviewForCommit(
  submissionId: number,
  commitSha: string | null,
): Promise<Review | null> {
  if (!commitSha) return null;
  const rows = (await sql`
    select r.*
    from reviews r
    join submissions s on s.id = r.submission_id
    where r.submission_id = ${submissionId} and s.commit_sha = ${commitSha}
    order by r.created_at desc
    limit 1
  `) as Review[];
  return rows[0] ?? null;
}

export async function recentReviews(limit = 25): Promise<Review[]> {
  return (await sql`
    select r.*, s.day_number, st.name as student_name
    from reviews r
    join submissions s on s.id = r.submission_id
    join students st on st.id = s.student_id
    order by r.created_at desc
    limit ${limit}
  `) as Review[];
}

export async function reviewById(id: number): Promise<Review | null> {
  const rows = (await sql`
    select r.*, s.day_number, st.name as student_name
    from reviews r
    join submissions s on s.id = r.submission_id
    join students st on st.id = s.student_id
    where r.id = ${id}
    limit 1
  `) as Review[];
  return rows[0] ?? null;
}

export async function studentByName(name: string): Promise<Student | null> {
  const rows = (await sql`select * from students where name = ${name} limit 1`) as Student[];
  return rows[0] ?? null;
}

export async function reviewsForStudent(studentId: number): Promise<Review[]> {
  return (await sql`
    select r.*, s.day_number, st.name as student_name
    from reviews r
    join submissions s on s.id = r.submission_id
    join students st on st.id = s.student_id
    where s.student_id = ${studentId}
    order by s.day_number asc, r.created_at desc
  `) as Review[];
}

/**
 * Leaderboard: PASS = 3, PASS_WITH_FIXES = 1, plus per-day earliness bonuses
 * (+5 first, +3 second, +2 third among students who eventually passed that day).
 */
export async function leaderboard(): Promise<
  { name: string; score: number; passes: number; fixes: number; redos: number }[]
> {
  const rows = (await sql`
    with best as (
      -- best status per (student, day): PASS > PASS_WITH_FIXES > REDO
      select s.student_id, s.day_number,
             max(case r.status when 'PASS' then 3 when 'PASS_WITH_FIXES' then 1 else 0 end) as pts,
             min(r.created_at) filter (where r.status = 'PASS') as first_pass_at
      from reviews r join submissions s on s.id = r.submission_id
      group by s.student_id, s.day_number
    ),
    ranked as (
      select b.student_id, b.day_number, b.pts,
             row_number() over (partition by b.day_number order by b.first_pass_at asc) as rk
      from best b
      where b.first_pass_at is not null
    ),
    bonuses as (
      select student_id, sum(case rk when 1 then 5 when 2 then 3 when 3 then 2 else 0 end) as bonus
      from ranked group by student_id
    ),
    totals as (
      select b.student_id,
             sum(b.pts) as base,
             count(*) filter (where b.pts = 3) as passes,
             count(*) filter (where b.pts = 1) as fixes,
             count(*) filter (where b.pts = 0) as redos
      from best b group by b.student_id
    )
    select st.name,
           (t.base + coalesce(bo.bonus, 0))::int as score,
           t.passes::int, t.fixes::int, t.redos::int
    from totals t
    join students st on st.id = t.student_id
    left join bonuses bo on bo.student_id = t.student_id
    order by score desc, st.name asc
  `) as { name: string; score: number; passes: number; fixes: number; redos: number }[];
  return rows;
}
