import { NextRequest, NextResponse } from "next/server";
import { deleteDay, getDay, updateDay } from "@/lib/db";
import { updateDaySchema } from "@/lib/adminSchemas";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const dayNumber = Number(n);
  if (!Number.isInteger(dayNumber) || !(await getDay(dayNumber))) {
    return NextResponse.json({ error: "Day not found." }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = updateDaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid day data." },
      { status: 400 },
    );
  }
  const day = await updateDay(dayNumber, parsed.data);
  return NextResponse.json({ day });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const dayNumber = Number(n);
  if (!Number.isInteger(dayNumber) || !(await getDay(dayNumber))) {
    return NextResponse.json({ error: "Day not found." }, { status: 404 });
  }
  await deleteDay(dayNumber);
  return NextResponse.json({ ok: true });
}
