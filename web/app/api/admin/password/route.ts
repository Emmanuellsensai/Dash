import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminPasswordValue, matchesAdminPassword, updateAdminPasswordValue } from "@/lib/adminPassword";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(128),
  confirmPassword: z.string().min(6).max(128),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => null);
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid password update." }, { status: 400 });
  }

  const { currentPassword = "", newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
  }

  const existing = getAdminPasswordValue();
  const hasExistingPassword = Boolean(existing && existing.trim());
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const isAdmin = await verifySessionToken(token);

  if (hasExistingPassword) {
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin session required." }, { status: 401 });
    }
    if (!matchesAdminPassword(currentPassword, existing)) {
      return NextResponse.json({ error: "Current admin password is incorrect." }, { status: 401 });
    }
  } else if (!isAdmin && !existing) {
    // Allow recovery when no admin password has been configured yet.
  } else if (!isAdmin) {
    return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  }

  updateAdminPasswordValue(newPassword);
  return NextResponse.json({ ok: true, message: "Admin password updated." });
}
