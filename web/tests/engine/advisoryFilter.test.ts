import { describe, expect, it } from "vitest";
import { filterFindings } from "../../lib/advisoryFilter";

const LINES = new Map([
  ["main.js", 10],
  ["app.ts", 5],
]);

function finding(overrides: Record<string, unknown> = {}) {
  return {
    category: "comments",
    file: "main.js",
    line: 3,
    severity: "note",
    problem: "The comment says the loop runs twice but it runs once",
    ...overrides,
  };
}

describe("filterFindings", () => {
  it("keeps a valid finding", () => {
    const out = filterFindings([finding()], LINES);
    expect(out).toHaveLength(1);
    expect(out[0].file).toBe("main.js");
    expect(out[0].line).toBe(3);
  });

  it("drops findings whose line does not exist in the file", () => {
    expect(filterFindings([finding({ line: 99 })], LINES)).toHaveLength(0);
    expect(filterFindings([finding({ line: 0 })], LINES)).toHaveLength(0);
    expect(filterFindings([finding({ file: "unknown.js" })], LINES)).toHaveLength(0);
  });

  it("drops fix style language case insensitively", () => {
    expect(filterFindings([finding({ problem: "You should rename this" })], LINES)).toHaveLength(0);
    expect(filterFindings([finding({ problem: "Try using a smaller name" })], LINES)).toHaveLength(0);
    expect(filterFindings([finding({ problem: "Consider a clearer name" })], LINES)).toHaveLength(0);
    expect(filterFindings([finding({ problem: "Better to split this" })], LINES)).toHaveLength(0);
  });

  it("drops findings containing backticks or code fences", () => {
    expect(filterFindings([finding({ problem: "Names like `x` hide intent" })], LINES)).toHaveLength(
      0,
    );
    expect(
      filterFindings([finding({ problem: "See ```js block``` in the comment" })], LINES),
    ).toHaveLength(0);
  });

  it("truncates problems to 200 characters", () => {
    const out = filterFindings([finding({ problem: "a".repeat(300) })], LINES);
    expect(out).toHaveLength(1);
    expect(out[0].problem.length).toBe(200);
  });

  it("deduplicates identical findings", () => {
    expect(filterFindings([finding(), finding(), finding()], LINES)).toHaveLength(1);
  });

  it("caps the list at 8 findings", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      finding({ line: 1, problem: `Problem number ${i}` }),
    );
    expect(filterFindings(many, LINES)).toHaveLength(8);
  });

  it("drops malformed findings and non arrays", () => {
    expect(filterFindings("nope", LINES)).toHaveLength(0);
    expect(filterFindings([null, 42, { category: "bugs" }], LINES)).toHaveLength(0);
    expect(
      filterFindings([finding({ category: "style" }), finding({ severity: "blocker" })], LINES),
    ).toHaveLength(0);
  });
});
