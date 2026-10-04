import { NextRequest, NextResponse } from "next/server";
import { deleteRule, getRule, updateRule } from "@/lib/db";
import { updateRuleSchema, validateParams, validateRuleType } from "@/lib/adminSchemas";

export const runtime = "nodejs";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  const existing = id === null ? null : await getRule(id);
  if (!existing) return NextResponse.json({ error: "Rule not found." }, { status: 404 });
  if (existing.system_managed) {
    return NextResponse.json(
      { error: "This rule is managed by the use strict toggle and cannot be edited here." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = updateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid rule data." },
      { status: 400 },
    );
  }

  const type = parsed.data.type ?? existing.type;
  if (!validateRuleType(type)) {
    return NextResponse.json({ error: `Unknown rule type "${type}".` }, { status: 400 });
  }
  const rawParams =
    parsed.data.params !== undefined ? parsed.data.params : (existing.params ?? {});
  const validated = validateParams(type, rawParams);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

  const rule = await updateRule(existing.id, {
    ...parsed.data,
    type,
    params: validated.data,
  });
  return NextResponse.json({ rule });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  const existing = id === null ? null : await getRule(id);
  if (!existing) return NextResponse.json({ error: "Rule not found." }, { status: 404 });
  if (existing.system_managed) {
    return NextResponse.json(
      { error: "This rule is managed by the use strict toggle and cannot be deleted here." },
      { status: 400 },
    );
  }
  await deleteRule(existing.id);
  return NextResponse.json({ ok: true });
}
