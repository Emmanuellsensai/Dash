import { NextResponse } from "next/server";
import { recentReviews } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const rows = await recentReviews(50);
  return NextResponse.json({ reviews: rows });
}
