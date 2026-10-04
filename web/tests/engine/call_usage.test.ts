import { describe, expect, it } from "vitest";
import { run } from "./helpers";

describe("call_usage", () => {
  it("passes when the call happens at least once", () => {
    const results = run(
      [{ path: "main.js", content: 'console.log("hi");' }],
      [{ type: "call_usage", params: { callee: "console.log" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails when the call never happens", () => {
    const results = run(
      [{ path: "main.js", content: "const x = 1;" }],
      [{ type: "call_usage", params: { callee: "console.log" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toContain("Found 0 call(s)");
  });

  it("counts only top level calls when where is top_level", () => {
    const files = [{ path: "main.js", content: "function f() {\n  console.log(1);\n}\n" }];
    const results = run(files, [
      { type: "call_usage", params: { callee: "console.log", where: "top_level", min: 1 } },
    ]);
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toContain("at top level");
  });

  it("counts only calls inside functions when where is inside_function", () => {
    const files = [{ path: "main.js", content: "function f() {\n  console.log(1);\n}\n" }];
    const results = run(files, [
      { type: "call_usage", params: { callee: "console.log", where: "inside_function" } },
    ]);
    expect(results[0].passed).toBe(true);
  });

  it("fails with line evidence when the maximum is exceeded", () => {
    const files = [{ path: "main.js", content: 'console.log(1);\nconsole.log(2);\n' }];
    const results = run(files, [
      { type: "call_usage", params: { callee: "console.log", max: 1 } },
    ]);
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].line).toBe(1);
    expect(results[0].evidence[0].detail).toContain("allowed maximum is 1");
  });
});
