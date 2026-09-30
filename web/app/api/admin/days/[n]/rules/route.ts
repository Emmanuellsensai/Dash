import { NextRequest, NextResponse } from "next/server";
import { createRule, getDay, nextRulePosition } from "@/lib/db";
import { ruleInputSchema, validateParams, validateRuleType } from "@/lib/adminSchemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const dayNumber = Number(n);
  if (!Number.isInteger(dayNumber) || !(await getDay(dayNumber))) {
    return NextResponse.json({ error: "Day not found." }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = ruleInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid rule data." },
      { status: 400 },
    );
  }
  const input = parsed.data;
  if (!validateRuleType(input.type)) {
    return NextResponse.json({ error: `Unknown rule type "${input.type}".` }, { status: 400 });
  }
  const validated = validateParams(input.type, input.params);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

  const rule = await createRule({
    day_number: dayNumber,
    position: input.position ?? (await nextRulePosition(dayNumber)),
    type: input.type,
    file_pattern: input.file_pattern,
    params: validated.data,
    message: input.message,
    severity: input.severity,
    enabled: input.enabled,
    system_managed: false,
  });
  return NextResponse.json({ rule }, { status: 201 });
}
