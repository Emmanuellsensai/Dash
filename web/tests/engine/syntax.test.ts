import { describe, expect, it } from "vitest";
import { run } from "./helpers";

describe("syntax_present", () => {
  it("passes when the feature exists", () => {
    const results = run(
      [{ path: "main.js", content: "const x = 1;" }],
      [{ type: "syntax_present", params: { feature: "const_declaration" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails with file evidence when the feature is missing", () => {
    const results = run(
      [{ path: "main.js", content: "var x = 1;" }],
      [{ type: "syntax_present", params: { feature: "const_declaration" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].file).toBe("main.js");
    expect(results[0].evidence[0].detail).toContain("const declaration");
  });

  it("honours the min parameter", () => {
    const files = [{ path: "main.js", content: "const a = 1;" }];
    const fail = run(files, [
      { type: "syntax_present", params: { feature: "const_declaration", min: 2 } },
    ]);
    expect(fail[0].passed).toBe(false);
    const pass = run(files, [
      { type: "syntax_present", params: { feature: "const_declaration", min: 1 } },
    ]);
    expect(pass[0].passed).toBe(true);
  });

  it("works on TypeScript files", () => {
    const results = run(
      [{ path: "app.ts", content: "const x: number = 1;" }],
      [{ type: "syntax_present", params: { feature: "const_declaration" } }],
    );
    expect(results[0].passed).toBe(true);
  });
});

describe("syntax_forbidden", () => {
  it("passes when the feature is absent", () => {
    const results = run(
      [{ path: "main.js", content: "if (a === b) {}" }],
      [{ type: "syntax_forbidden", params: { feature: "loose_equality" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails with line evidence when the feature is present", () => {
    const results = run(
      [{ path: "main.js", content: "const a = 1;\nif (a == 2) {}" }],
      [{ type: "syntax_forbidden", params: { feature: "loose_equality" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].file).toBe("main.js");
    expect(results[0].evidence[0].line).toBe(2);
    expect(results[0].evidence[0].detail).toContain("loose equality");
  });
});
