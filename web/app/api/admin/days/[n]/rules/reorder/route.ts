import { NextRequest, NextResponse } from "next/server";
import { getDay, setRuleOrder } from "@/lib/db";
import { reorderSchema } from "@/lib/adminSchemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const dayNumber = Number(n);
  if (!Number.isInteger(dayNumber) || !(await getDay(dayNumber))) {
    return NextResponse.json({ error: "Day not found." }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "order must be a list of rule ids." }, { status: 400 });
  }
  await setRuleOrder(parsed.data.order);
  return NextResponse.json({ ok: true });
}
