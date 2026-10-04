import { sql } from "../lib/db";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL in .env.local");
  }

  await sql`
    create table if not exists students (
      id serial primary key,
      name text not null,
      repo_url text not null unique,
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists submissions (
      id serial primary key,
      student_id int not null references students(id) on delete cascade,
      day_number int not null,
      commit_sha text,
      attempts int not null default 0,
      first_reviewed_at timestamptz not null default now(),
      unique (student_id, day_number)
    )
  `;

  await sql`
    create table if not exists days (
      day_number int primary key,
      title text not null,
      requirements_md text not null default '',
      require_use_strict boolean not null default false,
      published boolean not null default false,
      updated_at timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists rules (
      id serial primary key,
      day_number int references days(day_number) on delete cascade,
      position int not null,
      type text not null,
      file_pattern text not null default '**/*.js',
      params jsonb not null default '{}'::jsonb,
      message text not null,
      severity text not null check (severity in ('required', 'advisory')),
      enabled boolean not null default true,
      system_managed boolean not null default false
    )
  `;

  await sql`
    create table if not exists reviews (
      id serial primary key,
      submission_id int not null references submissions(id) on delete cascade,
      status text not null check (status in ('PASS', 'PASS_WITH_FIXES', 'REDO')),
      body text not null,
      rule_results jsonb not null default '[]'::jsonb,
      advisory jsonb,
      engine_version text not null default '',
      created_at timestamptz not null default now()
    )
  `;
  await sql`alter table reviews add column if not exists rule_results jsonb not null default '[]'::jsonb`;
  await sql`alter table reviews add column if not exists advisory jsonb`;
  await sql`alter table reviews add column if not exists engine_version text not null default ''`;
  await sql`alter table reviews drop column if exists model`;
  await sql`alter table reviews drop column if exists tokens_input`;
  await sql`alter table reviews drop column if exists tokens_output`;
  await sql`alter table reviews drop column if exists cost_cents`;

  await sql`
    create table if not exists gemini_usage (
      day date primary key,
      count int not null default 0
    )
  `;

  await sql`
    create table if not exists rate_limits (
      ip text primary key,
      last_at timestamptz not null
    )
  `;

  await sql`create index if not exists reviews_submission on reviews(submission_id)`;
  await sql`create index if not exists reviews_created on reviews(created_at desc)`;
  await sql`create index if not exists rules_day on rules(day_number, position)`;

  console.log("DB migrated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
