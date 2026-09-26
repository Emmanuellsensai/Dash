import { NextResponse } from "next/server";
import { leaderboard } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const rows = await leaderboard();
  return NextResponse.json({ leaderboard: rows });
}
