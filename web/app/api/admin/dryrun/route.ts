import { NextRequest, NextResponse } from "next/server";
import { dryRunSchema, validateParams, validateRuleType } from "@/lib/adminSchemas";
import { fetchDaySubmission } from "@/lib/github";
import { ENGINE_VERSION, runRules, type RunRule } from "@/lib/engine/run";
import { computeStatus } from "@/lib/engine/status";
import { generateAdvisory } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = dryRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid dry run data." },
      { status: 400 },
    );
  }
  const { repo, day, rules, useGemini } = parsed.data;

  const runInput: RunRule[] = [];
  for (const [i, r] of rules.entries()) {
    if (!validateRuleType(r.type)) {
      return NextResponse.json(
        { error: `Rule ${i + 1}: unknown rule type "${r.type}".` },
        { status: 400 },
      );
    }
    const params = validateParams(r.type, r.params);
    if (!params.ok) {
      return NextResponse.json({ error: `Rule ${i + 1}: ${params.error}` }, { status: 400 });
    }
    runInput.push({
      id: r.id ?? i + 1,
      type: r.type,
      severity: r.severity,
      file_pattern: r.file_pattern,
      params: params.data,
      message: r.message,
    });
  }

  const fetched = await fetchDaySubmission(repo, day.day_number);
  if ("error" in fetched) {
    return NextResponse.json({ error: fetched.error }, { status: 400 });
  }

  const results = runRules(fetched.files, runInput, day);
  const status = computeStatus(results);

  let advisory = null;
  if (useGemini) {
    try {
      advisory = await generateAdvisory({
        files: fetched.files,
        requirementsMd: day.requirements_md,
      });
    } catch (e) {
      advisory = {
        status: "unavailable" as const,
        reason: e instanceof Error ? e.message.slice(0, 200) : "Advisory failed.",
      };
    }
  }

  return NextResponse.json({
    engineVersion: ENGINE_VERSION,
    folderPath: fetched.folderPath,
    truncated: fetched.truncated,
    skipped: fetched.skipped,
    status,
    results,
    advisory,
  });
}
