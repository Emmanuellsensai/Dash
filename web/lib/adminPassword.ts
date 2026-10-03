import { timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function defaultAdminPasswordFilePath(): string {
  return join(process.cwd(), ".env.local");
}

export function getAdminPasswordValue(filePath = defaultAdminPasswordFilePath()): string {
  if (!existsSync(filePath)) return "";
  const content = readFileSync(filePath, "utf8");
  const match = content.match(/^ADMIN_PASSWORD=(.*)$/m);
  return match ? match[1].trim() : "";
}

export function updateAdminPasswordValue(filePathOrPassword: string, maybePassword?: string): void {
  const filePath = maybePassword ? filePathOrPassword : defaultAdminPasswordFilePath();
  const newPassword = maybePassword ?? filePathOrPassword;
  const cleanPassword = String(newPassword ?? "").trim();
  const envFile = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const lines = envFile.split(/\r?\n/);
  let found = false;
  const nextLines = lines.map((line) => {
    if (/^ADMIN_PASSWORD=/.test(line)) {
      found = true;
      return `ADMIN_PASSWORD=${cleanPassword}`;
    }
    return line;
  });

  if (!found) {
    nextLines.push(`ADMIN_PASSWORD=${cleanPassword}`);
  }

  const updated = nextLines.join("\n");
  writeFileSync(filePath, updated.endsWith("\n") ? updated : `${updated}\n`);
  process.env.ADMIN_PASSWORD = cleanPassword;
}

export function matchesAdminPassword(password: string, expected: string): boolean {
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
