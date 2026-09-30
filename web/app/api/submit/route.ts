import { NextRequest, NextResponse } from "next/server";
import { upsertStudent, getOrCreateSubmission } from "@/lib/db";
import { fetchDaySubmission } from "@/lib/github";
import { daySection } from "@/lib/curriculum";
import { allow } from "@/lib/rateLimit";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  name?: string;
  repo?: string;
  day?: number;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const body = (await req.json().catch(() => ({}))) as Body;

  const name = (body.name ?? "").trim();
  const repo = (body.repo ?? "").trim();
  const day = Number(body.day);
  const isAdmin = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (!name || !repo || !Number.isInteger(day) || day < 1 || day > 30) {
    return NextResponse.json(
      { error: "Send { name, repo, day } (day 1-30)." },
      { status: 400 },
    );
  }
  if (!isAdmin && !(await allow(ip))) {
    return NextResponse.json({ error: "Slow down. Try again in 30 seconds." }, { status: 429 });
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
  await getOrCreateSubmission(student.id, day, fetched.lastCommitSha);

  return NextResponse.json(
    { error: "The rule engine is not connected yet." },
    { status: 501 },
  );
}
