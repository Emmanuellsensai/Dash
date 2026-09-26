import { NextRequest, NextResponse } from "next/server";
import {
  upsertStudent,
  getOrCreateSubmission,
  incrementAttempts,
  insertReview,
  latestReviewForCommit,
} from "@/lib/db";
import { fetchDaySubmission } from "@/lib/github";
import { daySection, readRules } from "@/lib/curriculum";
import { reviewSubmission } from "@/lib/claude";
import { allow } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  name?: string;
  repo?: string;
  day?: number;
  admin?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const body = (await req.json().catch(() => ({}))) as Body;

  const name = (body.name ?? "").trim();
  const repo = (body.repo ?? "").trim();
  const day = Number(body.day);
  const isAdmin =
    !!process.env.ADMIN_PASSWORD && body.admin === process.env.ADMIN_PASSWORD;

  if (!name || !repo || !Number.isInteger(day) || day < 1 || day > 30) {
    return NextResponse.json(
      { error: "Send { name, repo, day } (day 1-30)." },
      { status: 400 },
    );
  }
  if (!isAdmin && !allow(ip)) {
    return NextResponse.json({ error: "Slow down. Try again in 30 seconds." }, { status: 429 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Server is missing ANTHROPIC_API_KEY." }, { status: 500 });
  }

  const section = await daySection(day);
  if (!section) {
    return NextResponse.json(
      { error: `Day ${day} is not in the curriculum yet.` },
      { status: 400 },
    );
  }

  const fetched = await fetchDaySubmission(repo, day);
  if ("error" in fetched) {
    return NextResponse.json({ error: fetched.error }, { status: 400 });
  }
  if (!fetched.files.length) {
    return NextResponse.json(
      { error: `No code files found in ${fetched.folderPath}.` },
      { status: 400 },
    );
  }

  const student = await upsertStudent(name, repo);
  const submission = await getOrCreateSubmission(student.id, day, fetched.lastCommitSha);

  // Commit-hash dedup: same commit as last review -> return the stored review, no charge.
  if (fetched.lastCommitSha) {
    const cached = await latestReviewForCommit(submission.id, fetched.lastCommitSha);
    if (cached) {
      return NextResponse.json({ review: cached, cached: true });
    }
  }

  const cap = Number(process.env.MAX_ATTEMPTS_PER_SUBMISSION ?? "2");
  if (!isAdmin && submission.attempts >= cap) {
    return NextResponse.json(
      {
        error: `You've used your ${cap} review attempts for day ${day}. Push a new commit or ask the teacher.`,
      },
      { status: 429 },
    );
  }

  try {
    const rules = await readRules();
    const result = await reviewSubmission({
      rules,
      daySection: section,
      studentName: name,
      day,
      files: fetched.files,
      folderPath: fetched.folderPath,
      commitSha: fetched.lastCommitSha,
      commitDate: fetched.lastCommitDate,
      truncated: fetched.truncated,
    });
    await incrementAttempts(submission.id, fetched.lastCommitSha);
    const saved = await insertReview({
      submissionId: submission.id,
      status: result.status,
      body: result.body,
      model: result.model,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      costCents: result.costCents,
    });
    return NextResponse.json({ review: { ...saved, student_name: name, day_number: day } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Review failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
