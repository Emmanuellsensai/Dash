import { describe, expect, it } from "vitest";
import { run } from "./helpers";

describe("json_field", () => {
  it("passes when the field equals the expected value", () => {
    const results = run(
      [{ path: "package.json", content: '{"name": "drills"}' }],
      [{ type: "json_field", file_pattern: "**/*.json", params: { jsonPath: "name", equals: "drills" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails with line evidence when the value differs", () => {
    const results = run(
      [{ path: "tsconfig.json", content: '{\n  "compilerOptions": {\n    "strict": false\n  }\n}' }],
      [
        {
          type: "json_field",
          file_pattern: "**/*.json",
          params: { jsonPath: "compilerOptions.strict", equals: true },
        },
      ],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].file).toBe("tsconfig.json");
    expect(results[0].evidence[0].line).toBe(3);
    expect(results[0].evidence[0].detail).toContain("expected true");
  });

  it("fails when the path is missing", () => {
    const results = run(
      [{ path: "package.json", content: '{"name": "drills"}' }],
      [{ type: "json_field", file_pattern: "**/*.json", params: { jsonPath: "scripts.test" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toBe("Path scripts.test not found in this file");
  });

  it("checks only existence when equals is omitted", () => {
    const results = run(
      [{ path: "package.json", content: '{"scripts": {"build": "next build"}}' }],
      [{ type: "json_field", file_pattern: "**/*.json", params: { jsonPath: "scripts.build" } }],
    );
    expect(results[0].passed).toBe(true);
  });

  it("reads JSONC files with comments and trailing commas", () => {
    const content = `{
  // a comment
  "compilerOptions": {
    "strict": true,
  },
}`;
    const results = run(
      [{ path: "tsconfig.json", content }],
      [
        {
          type: "json_field",
          file_pattern: "**/*.json",
          params: { jsonPath: "compilerOptions.strict", equals: true },
        },
      ],
    );
    expect(results[0].passed).toBe(true);
  });

  it("fails on invalid JSON", () => {
    const results = run(
      [{ path: "package.json", content: "{not json" }],
      [{ type: "json_field", file_pattern: "**/*.json", params: { jsonPath: "name" } }],
    );
    expect(results[0].passed).toBe(false);
    expect(results[0].evidence[0].detail).toBe("File is not valid JSON");
  });
});
