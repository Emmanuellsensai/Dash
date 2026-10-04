import { NextRequest, NextResponse } from "next/server";
import {
  createRule,
  deleteRule,
  getDay,
  getDayWithRules,
  nextRulePosition,
  updateDay,
} from "@/lib/db";
import { useStrictSchema } from "@/lib/adminSchemas";

export const runtime = "nodejs";

const SYSTEM_RULE_TYPE = "directive";

export async function POST(req: NextRequest, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const dayNumber = Number(n);
  if (!Number.isInteger(dayNumber)) {
    return NextResponse.json({ error: "Day not found." }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = useStrictSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 });
  }

  const withRules = await getDayWithRules(dayNumber);
  if (!withRules) return NextResponse.json({ error: "Day not found." }, { status: 404 });

  const existing = withRules.rules.find((r) => r.system_managed && r.type === SYSTEM_RULE_TYPE);

  if (parsed.data.enabled && !existing) {
    await createRule({
      day_number: dayNumber,
      position: await nextRulePosition(dayNumber),
      type: SYSTEM_RULE_TYPE,
      file_pattern: "**/*.js",
      params: { value: "use strict", where: "top_of_file", acceptModuleSyntax: false },
      message: 'The file must start with the "use strict" directive.',
      severity: "required",
      enabled: true,
      system_managed: true,
    });
  }
  if (!parsed.data.enabled && existing) {
    await deleteRule(existing.id);
  }

  const day = await updateDay(dayNumber, { require_use_strict: parsed.data.enabled });
  const refreshed = await getDayWithRules(dayNumber);
  return NextResponse.json({ day, rules: refreshed?.rules ?? [] });
}
