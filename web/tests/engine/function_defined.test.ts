import { describe, expect, it } from "vitest";
import { run } from "./helpers";

describe("function_defined", () => {
  it("passes for a function declaration", () => {
    const results = run(
      [{ path: "main.js", content: "function greet(name) {\n  return name;\n}" }],
      [{ type: "function_defined", params: { name: "greet" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails when the function is missing", () => {
    const results = run(
      [{ path: "main.js", content: "const x = 1;" }],
      [{ type: "function_defined", params: { name: "greet" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toBe("Function greet not found");
  });

  it("treats const arrow and const function expressions as definitions", () => {
    const arrow = run(
      [{ path: "main.js", content: "const add = (a, b) => a + b;" }],
      [{ type: "function_defined", params: { name: "add", kind: "arrow" } }],
    );
    expect(arrow[0].passed).toBe(true);

    const fnExpr = run(
      [{ path: "main.js", content: "const add = function (a, b) { return a + b; };" }],
      [{ type: "function_defined", params: { name: "add" } }],
    );
    expect(fnExpr[0].passed).toBe(true);
  });

  it("fails when the kind does not match", () => {
    const results = run(
      [{ path: "main.js", content: "function greet() {}" }],
      [{ type: "function_defined", params: { name: "greet", kind: "arrow" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toContain("kind arrow");
  });

  it("checks parameter counts", () => {
    const files = [{ path: "main.js", content: "function greet(a, b) {\n  return a;\n}" }];
    const tooMany = run(files, [
      { type: "function_defined", params: { name: "greet", maxParams: 1 } },
    ]);
    expect(tooMany[0].passed).toBe(false);
    expect(tooMany[0].evidence[0].detail).toContain("expected at most 1");

    const enough = run(files, [
      { type: "function_defined", params: { name: "greet", minParams: 2 } },
    ]);
    expect(enough[0].passed).toBe(true);
  });

  it("checks that a value is returned", () => {
    const noReturn = run(
      [{ path: "main.js", content: "function f() {\n  console.log(1);\n}" }],
      [{ type: "function_defined", params: { name: "f", mustReturnValue: true } }],
    );
    expect(noReturn[0].passed).toBe(false);
    expect(noReturn[0].evidence[0].detail).toContain("does not return a value");

    const withReturn = run(
      [{ path: "main.js", content: "function f() {\n  return 1;\n}" }],
      [{ type: "function_defined", params: { name: "f", mustReturnValue: true } }],
    );
    expect(withReturn[0].passed).toBe(true);
  });

  it("works on TypeScript files", () => {
    const results = run(
      [{ path: "app.ts", content: "const add = (a: number, b: number): number => a + b;" }],
      [{ type: "function_defined", params: { name: "add", kind: "arrow", minParams: 2 } }],
    );
    expect(results[0].passed).toBe(true);
  });
});
