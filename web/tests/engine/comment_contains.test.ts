import { describe, expect, it } from "vitest";
import { run } from "./helpers";

describe("comment_contains", () => {
  it("passes when a matching comment exists", () => {
    const results = run(
      [{ path: "main.js", content: "// SURPRISES: none\nconst x = 1;" }],
      [{ type: "comment_contains", params: { pattern: "SURPRISES" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails when no comment matches", () => {
    const results = run(
      [{ path: "main.js", content: "const x = 1;" }],
      [{ type: "comment_contains", params: { pattern: "SURPRISES" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].file).toBe("main.js");
    expect(results[0].evidence[0].detail).toContain("expected at least 1");
  });

  it("supports regular expressions", () => {
    const files = [{ path: "main.js", content: "/* TODO: revisit later */\nconst x = 1;" }];
    const regex = run(files, [
      { type: "comment_contains", params: { pattern: "TODO:.*later", isRegex: true } },
    ]);
    expect(regex[0].passed).toBe(true);

    const literal = run(files, [
      { type: "comment_contains", params: { pattern: "TODO:.*later", isRegex: false } },
    ]);
    expect(literal[0].passed).toBe(false);
  });

  it("honours the min parameter", () => {
    const files = [{ path: "main.js", content: "// NOTE: one\nconst x = 1;" }];
    const results = run(files, [
      { type: "comment_contains", params: { pattern: "NOTE", min: 2 } },
    ]);
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toContain("Found 1 matching comment(s)");
  });

  it("reads TypeScript comments too", () => {
    const results = run(
      [{ path: "app.ts", content: "// SURPRISES: none\nconst x: number = 1;" }],
      [{ type: "comment_contains", params: { pattern: "SURPRISES" } }],
    );
    expect(results[0].passed).toBe(true);
  });
});
