import { describe, expect, it } from "vitest";
import { run } from "./helpers";

describe("identifier_declared", () => {
  it("passes when the identifier is declared", () => {
    const results = run(
      [{ path: "main.js", content: "let attempts = 0;" }],
      [{ type: "identifier_declared", params: { name: "attempts" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails when the identifier is never declared", () => {
    const results = run(
      [{ path: "main.js", content: "console.log(total);" }],
      [{ type: "identifier_declared", params: { name: "total" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toBe("Identifier total is not declared");
  });

  it("checks the declaration kind when given", () => {
    const files = [{ path: "main.js", content: "var count = 1;" }];
    const wrongKind = run(files, [
      { type: "identifier_declared", params: { name: "count", kind: "let" } },
    ]);
    expect(wrongKind[0].passed).toBe(false);
    expect(wrongKind[0].evidence[0].detail).toContain("as let");

    const rightKind = run(files, [
      { type: "identifier_declared", params: { name: "count", kind: "var" } },
    ]);
    expect(rightKind[0].passed).toBe(true);
  });

  it("finds function parameters", () => {
    const results = run(
      [{ path: "main.js", content: "function f(attempts) {\n  return attempts;\n}" }],
      [{ type: "identifier_declared", params: { name: "attempts", kind: "param" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("finds destructured names", () => {
    const results = run(
      [{ path: "main.js", content: "const { name } = person;" }],
      [{ type: "identifier_declared", params: { name: "name", kind: "const" } }],
    );
    expect(results[0].passed).toBe(true);
  });
});
