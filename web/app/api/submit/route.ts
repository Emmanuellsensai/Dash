import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  cachedAdvisory,
  getDayWithRules,
  getOrCreateSubmission,
  incrementAttempts,
  insertReview,
  latestReviewForCommit,
  upsertStudent,
} from "@/lib/db";
import { fetchDaySubmission } from "@/lib/github";
import { ENGINE_VERSION, runRules } from "@/lib/engine/run";
import { computeStatus } from "@/lib/engine/status";
import { generateAdvisory } from "@/lib/gemini";
import { buildSummary } from "@/lib/format";
import { allow } from "@/lib/rateLimit";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  name: z.string().trim().min(1),
  repo: z.string().trim().min(1),
  day: z.number().int().min(1),
});

function truncationNote(skipped: string[]): string {
  const shown = skipped.slice(0, 10).join(", ");
  const more = skipped.length > 10 ? `, +${skipped.length - 10} more` : "";
  return `\nNote: submission truncated, ${skipped.length} file(s) skipped: ${shown}${more}.`;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Send { name, repo, day } with day 1 or higher." },
      { status: 400 },
    );
  }
  const { name, repo, day } = parsed.data;

  const isAdmin = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!isAdmin && !(await allow(ip))) {
    return NextResponse.json({ error: "Slow down. Try again in 30 seconds." }, { status: 429 });
  }

  const withRules = await getDayWithRules(day, { enabledOnly: true });
  if (!withRules || !withRules.day.published || withRules.rules.length === 0) {
    return NextResponse.json({ error: `Day ${day} is not set up yet.` }, { status: 400 });
  }
  const { day: dayRow, rules } = withRules;

  const fetched = await fetchDaySubmission(repo, day);
  if ("error" in fetched) {
    return NextResponse.json({ error: fetched.error }, { status: 400 });
  }

  const student = await upsertStudent(name, repo);
  const submission = await getOrCreateSubmission(student.id, day, fetched.lastCommitSha);

  if (fetched.lastCommitSha) {
    const cached = await latestReviewForCommit(submission.id, fetched.lastCommitSha);
    if (cached) return NextResponse.json({ review: cached, cached: true });
  }

  const cap = Number(process.env.MAX_ATTEMPTS_PER_SUBMISSION ?? "2");
  if (!isAdmin && cap > 0 && submission.attempts >= cap) {
    return NextResponse.json(
      {
        error: `You've used your ${cap} review attempts for day ${day}. Push a new commit or ask the teacher.`,
      },
      { status: 429 },
    );
  }

  try {
    const results = runRules(fetched.files, rules, dayRow);
    const status = computeStatus(results);

    let advisory = await cachedAdvisory(submission.id, fetched.lastCommitSha);
    if (!advisory) {
      try {
        advisory = await generateAdvisory({
          files: fetched.files,
          requirementsMd: dayRow.requirements_md,
        });
      } catch (e) {
        advisory = {
          status: "unavailable",
          reason: e instanceof Error ? e.message.slice(0, 200) : "Advisory failed.",
        };
      }
    }

    let body = buildSummary(results, status, advisory);
    if (fetched.truncated && fetched.skipped.length > 0) {
      body += truncationNote(fetched.skipped);
    }

    await incrementAttempts(submission.id, fetched.lastCommitSha);
    const saved = await insertReview({
      submissionId: submission.id,
      status,
      body,
      ruleResults: results,
      advisory,
      engineVersion: ENGINE_VERSION,
    });
    return NextResponse.json({ review: { ...saved, student_name: name, day_number: day } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Review failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
