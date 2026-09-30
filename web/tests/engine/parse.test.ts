import { describe, expect, it } from "vitest";
import { parseSource } from "../../lib/engine/parse";

describe("parseSource", () => {
  it("parses JavaScript and collects comments", () => {
    const result = parseSource("main.js", "// hello\nconst x = 1;");
    expect(result.error).toBeNull();
    expect(result.ast?.type).toBe("Program");
    expect(result.comments).toEqual([
      { type: "Line", value: " hello", line: 1, column: 0 },
    ]);
  });

  it("returns a syntax error with line and column for broken JavaScript", () => {
    const result = parseSource("main.js", "const x = ;");
    expect(result.ast).toBeNull();
    expect(result.error?.line).toBe(1);
    expect(typeof result.error?.column).toBe("number");
    expect(result.error?.message.length).toBeGreaterThan(0);
  });

  it("parses TypeScript annotations", () => {
    const result = parseSource("app.ts", "const x: number = 1;\nexport { x };");
    expect(result.error).toBeNull();
    expect(result.ast?.type).toBe("Program");
  });

  it("returns a syntax error for broken TypeScript", () => {
    const result = parseSource("app.ts", "const x: number = ;");
    expect(result.ast).toBeNull();
    expect(result.error?.line).toBe(1);
  });

  it("skips files that are not code", () => {
    const result = parseSource("notes.md", "this is not ( javascript");
    expect(result.ast).toBeNull();
    expect(result.error).toBeNull();
    expect(result.comments).toEqual([]);
  });
});
