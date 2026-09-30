import { NextRequest, NextResponse } from "next/server";
import { createDay, getDay } from "@/lib/db";
import { createDaySchema } from "@/lib/adminSchemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createDaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid day data." },
      { status: 400 },
    );
  }
  if (await getDay(parsed.data.day_number)) {
    return NextResponse.json(
      { error: `Day ${parsed.data.day_number} already exists.` },
      { status: 409 },
    );
  }
  const day = await createDay(parsed.data);
  return NextResponse.json({ day }, { status: 201 });
}
