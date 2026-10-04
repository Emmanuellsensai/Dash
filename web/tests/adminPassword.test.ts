import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { updateAdminPasswordValue } from "../lib/adminPassword";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe("updateAdminPasswordValue", () => {
  it("adds a new ADMIN_PASSWORD to an env file when missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "dash-admin-"));
    tempDirs.push(dir);
    const envPath = join(dir, ".env.local");
    writeFileSync(envPath, "DATABASE_URL=abc\nSESSION_SECRET=xyz\n");

    updateAdminPasswordValue(envPath, "new-secret");

    const text = readFileSync(envPath, "utf8");
    expect(text).toContain("ADMIN_PASSWORD=new-secret");
    expect(text).toContain("DATABASE_URL=abc");
  });

  it("replaces an existing ADMIN_PASSWORD value without duplicating it", () => {
    const dir = mkdtempSync(join(tmpdir(), "dash-admin-"));
    tempDirs.push(dir);
    const envPath = join(dir, ".env.local");
    writeFileSync(
      envPath,
      "DATABASE_URL=abc\nADMIN_PASSWORD=old-secret\nSESSION_SECRET=xyz\n",
    );

    updateAdminPasswordValue(envPath, "new-secret");

    const text = readFileSync(envPath, "utf8");
    expect(text.match(/^ADMIN_PASSWORD=/gm)?.length).toBe(1);
    expect(text).toContain("ADMIN_PASSWORD=new-secret");
    expect(text).not.toContain("ADMIN_PASSWORD=old-secret");
  });
});
