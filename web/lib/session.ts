import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "dash_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function secretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("SESSION_SECRET is not set.");
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const key = secretKey();
  if (!key || !token) return false;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
