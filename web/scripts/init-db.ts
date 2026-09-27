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
    create table if not exists reviews (
      id serial primary key,
      submission_id int not null references submissions(id) on delete cascade,
      status text not null check (status in ('PASS', 'PASS_WITH_FIXES', 'REDO')),
      body text not null,
      model text not null,
      tokens_input int not null default 0,
      tokens_output int not null default 0,
      cost_cents int not null default 0,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists reviews_submission on reviews(submission_id)`;
  await sql`create index if not exists reviews_created on reviews(created_at desc)`;

  console.log("DB ready.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
