import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/session";

const loginSchema = z.object({ password: z.string().min(1) });

export const runtime = "nodejs";

function matches(password: string, expected: string): boolean {
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not set." }, { status: 500 });
  }
  const raw = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(raw);
  const password = parsed.success ? parsed.data.password : "";
  if (!password || !matches(password, expected)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
