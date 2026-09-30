import { NextRequest, NextResponse } from "next/server";
import { daySection } from "@/lib/curriculum";

export const runtime = "nodejs";

const FILENAME = /\b[\w-]+\.(?:js|mjs|cjs|ts|tsx|html|css|json)\b/g;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("day") ?? "";
  const day = Number(raw);
  if (!Number.isInteger(day) || day < 1) {
    return NextResponse.json({ error: "Send ?day=N." }, { status: 400 });
  }
  const section = await daySection(day);
  if (!section) {
    return NextResponse.json(
      { error: `Day ${day} is not in curriculum.md.` },
      { status: 404 },
    );
  }
  const matches = section.match(FILENAME) ?? [];
  const filenames = [...new Set(matches)].slice(0, 20);
  return NextResponse.json({ section, filenames });
}
